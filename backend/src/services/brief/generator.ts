import { BriefItemModel, BriefItem } from '../../models/BriefItem';
import { IntegrationModel } from '../../models/Integration';
import { SlackIntegration } from '../integrations/SlackIntegration';
import { GitHubIntegration } from '../integrations/GitHubIntegration';
import { JiraIntegration } from '../integrations/JiraIntegration';
import { CalendarIntegration } from '../integrations/CalendarIntegration';
import { calculateUrgency, UrgencyFactors } from './urgency';

export class BriefGenerator {
  async generateBrief(userId: string): Promise<BriefItem[]> {
    const integrations = await IntegrationModel.findByUser(userId);
    const activeIntegrations = integrations.filter(i => i.is_active);
    
    const briefItems: BriefItem[] = [];

    // Generate items from each integration
    for (const integration of activeIntegrations) {
      try {
        switch (integration.provider) {
          case 'slack':
            const slackItems = await this.generateSlackItems(userId, integration);
            briefItems.push(...slackItems);
            break;
          case 'github':
            const githubItems = await this.generateGitHubItems(userId, integration);
            briefItems.push(...githubItems);
            break;
          case 'jira':
            const jiraItems = await this.generateJiraItems(userId, integration);
            briefItems.push(...jiraItems);
            break;
          case 'calendar':
            const calendarItems = await this.generateCalendarItems(userId, integration);
            briefItems.push(...calendarItems);
            break;
        }
      } catch (error) {
        console.error(`Error generating brief items for ${integration.provider}:`, error);
      }
    }

    // Save all brief items
    const savedItems: BriefItem[] = [];
    for (const item of briefItems) {
      // Check if item already exists
      if (item.external_id) {
        const existing = await BriefItemModel.findByExternalId(
          userId,
          item.external_id,
          item.source
        );
        if (existing) {
          // Update existing item
          continue;
        }
      }
      
      const saved = await BriefItemModel.create(item);
      savedItems.push(saved);
    }

    return savedItems;
  }

  private async generateSlackItems(userId: string, integration: any): Promise<BriefItem[]> {
    const config = {
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      redirectUri: process.env.SLACK_REDIRECT_URI || ''
    };
    const slack = new SlackIntegration(config);
    const threads = await slack.fetchUrgentMessages(userId);

    const items: BriefItem[] = [];

    for (const thread of threads) {
      if (thread.messages.length < 3) continue; // Skip small threads

      const firstMessage = thread.messages[0];
      const replyCount = thread.messages.length - 1;
      const daysWaiting = this.calculateDaysWaiting(firstMessage.ts);

      const urgency = calculateUrgency({
        blockingCount: replyCount >= 3 ? 1 : 0,
        daysWaiting
      });

      items.push({
        user_id: userId,
        type: 'item',
        source: 'slack',
        urgency,
        text: `Thread in ${thread.channel}: ${firstMessage.text.substring(0, 100)}... (${replyCount} replies)`,
        metadata: {
          channel: thread.channel,
          thread_ts: thread.thread_ts,
          message_count: replyCount,
          blocked: thread.messages.slice(1).map(m => ({ n: m.user || 'Unknown' }))
        },
        external_id: `${thread.channel}-${thread.thread_ts}`,
        external_url: `https://slack.com/app_redirect?channel=${thread.channel}&ts=${thread.thread_ts}`,
        processed_at: new Date()
      });
    }

    return items;
  }

  private async generateGitHubItems(userId: string, integration: any): Promise<BriefItem[]> {
    const config = {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      redirectUri: process.env.GITHUB_REDIRECT_URI || ''
    };
    const github = new GitHubIntegration(config);
    const prs = await github.fetchPRsNeedingReview(userId);

    const items: BriefItem[] = [];

    for (const pr of prs) {
      const daysWaiting = this.calculateDaysWaiting(pr.updated_at);
      const isBlocking = pr.requested_reviewers && pr.requested_reviewers.length > 0;

      const urgency = calculateUrgency({
        blockingCount: isBlocking ? 1 : 0,
        daysWaiting,
        sprintRisk: daysWaiting >= 1
      });

      items.push({
        user_id: userId,
        type: 'item',
        source: 'github',
        urgency,
        text: `PR #${pr.number}: ${pr.title} - ${pr.changed_files || 0} files changed`,
        metadata: {
          pr_number: pr.number,
          pr_url: pr.html_url,
          additions: pr.additions,
          deletions: pr.deletions,
          changed_files: pr.changed_files,
          blocked: pr.requested_reviewers?.map(r => ({ n: r.login })) || []
        },
        external_id: `pr-${pr.id}`,
        external_url: pr.html_url,
        processed_at: new Date()
      });
    }

    return items;
  }

  private async generateJiraItems(userId: string, integration: any): Promise<BriefItem[]> {
    const config = {
      clientId: process.env.JIRA_CLIENT_ID || '',
      clientSecret: process.env.JIRA_CLIENT_SECRET || '',
      redirectUri: process.env.JIRA_REDIRECT_URI || ''
    };
    const baseUrl = integration.config?.baseUrl || process.env.JIRA_BASE_URL || '';
    const jira = new JiraIntegration(config, baseUrl);
    const issues = await jira.fetchAssignedIssues(userId);

    const items: BriefItem[] = [];

    for (const issue of issues) {
      const daysWaiting = this.calculateDaysWaiting(issue.updated);
      const dueDate = issue.dueDate ? new Date(issue.dueDate) : undefined;

      const urgency = calculateUrgency({
        daysWaiting,
        dueDate,
        sprintRisk: issue.status !== 'Done'
      });

      items.push({
        user_id: userId,
        type: 'item',
        source: 'jira',
        urgency,
        text: `${issue.key}: ${issue.summary}`,
        metadata: {
          issue_key: issue.key,
          status: issue.status,
          priority: issue.priority,
          due_date: issue.dueDate
        },
        external_id: issue.id,
        external_url: issue.url,
        processed_at: new Date()
      });
    }

    return items;
  }

  private async generateCalendarItems(userId: string, integration: any): Promise<BriefItem[]> {
    const config = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || ''
    };
    const calendar = new CalendarIntegration(config);
    const events = await calendar.fetchTodaysEvents(userId);

    if (events.length === 0) return [];

    // Create a single calendar item summarizing the day
    const items: BriefItem[] = [{
      user_id: userId,
      type: 'calendar',
      source: 'calendar',
      urgency: 'fyi',
      text: `Today's schedule: ${events.length} event${events.length > 1 ? 's' : ''}`,
      metadata: {
        events: events.map(e => ({
          time: e.start.dateTime,
          summary: e.summary,
          location: e.location
        }))
      },
      external_id: `calendar-${new Date().toISOString().split('T')[0]}`,
      processed_at: new Date()
    }];

    return items;
  }

  private calculateDaysWaiting(timestamp: string): number {
    const then = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - then.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}

