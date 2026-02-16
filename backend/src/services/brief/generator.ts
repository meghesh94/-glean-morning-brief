import { BriefItemModel, BriefItem } from '../../models/BriefItem';
import { IntegrationModel } from '../../models/Integration';
import { SlackIntegration } from '../integrations/SlackIntegration';
import { GitHubIntegration } from '../integrations/GitHubIntegration';
import { JiraIntegration } from '../integrations/JiraIntegration';
import { CalendarIntegration } from '../integrations/CalendarIntegration';
import { GleanMCPIntegration } from '../integrations/GleanMCP';
import { calculateUrgency, UrgencyFactors } from './urgency';
import { mockSlackThreads, mockGitHubPRs, mockJiraIssues, mockCalendarEvents } from './mockData';

// Use mock data if USE_MOCK_DATA is true OR if no integrations are connected
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';
// Use Glean MCP if GLEAN_MCP_ENABLED is true
const USE_GLEAN_MCP = process.env.GLEAN_MCP_ENABLED === 'true';

export class BriefGenerator {
  async generateBrief(userId: string): Promise<BriefItem[]> {
    try {
      // Priority 1: Use Glean MCP if enabled
      if (USE_GLEAN_MCP) {
        console.log(`GLEAN_MCP_ENABLED, using Glean MCP for user ${userId}`);
        return this.generateBriefFromGleanMCP(userId);
      }

      // Priority 2: Use mock data if enabled
      if (USE_MOCK_DATA) {
        console.log(`USE_MOCK_DATA enabled, using mock data for user ${userId}`);
        return this.generateMockBrief(userId);
      }

      // Priority 3: Use individual integrations
      const integrations = await IntegrationModel.findByUser(userId);
      const activeIntegrations = integrations.filter(i => i.is_active);
      
      if (activeIntegrations.length === 0) {
        console.log(`No active integrations for user ${userId}, returning empty brief`);
        return [];
      }
      
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
          // Continue with other integrations even if one fails
        }
      }

      // Save all brief items
      const savedItems: BriefItem[] = [];
      for (const item of briefItems) {
        try {
          // Check if item already exists
          if (item.external_id) {
            const existing = await BriefItemModel.findByExternalId(
              userId,
              item.external_id,
              item.source
            );
            if (existing) {
              // Item already exists, skip (or could update if needed)
              savedItems.push(existing);
              continue;
            }
          }
          
          // Create new item
          const saved = await BriefItemModel.create(item);
          savedItems.push(saved);
        } catch (error) {
          console.error(`Error saving brief item:`, error);
          // Continue with other items even if one fails
        }
      }

      return savedItems;
    } catch (error) {
      console.error('Error in generateBrief:', error);
      // Return empty array instead of throwing - allows frontend to show empty state
      return [];
    }
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
        type: 'item' as const,
        source: 'slack' as const,
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
      } as any);
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
        type: 'item' as const,
        source: 'github' as const,
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
      } as any);
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
        type: 'item' as const,
        source: 'jira' as const,
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
      } as any);
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
      type: 'calendar' as const,
      source: 'calendar' as const,
      urgency: 'fyi' as const,
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
    } as any];

    return items;
  }

  private calculateDaysWaiting(timestamp: string): number {
    const then = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - then.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Generate brief from mock data
  private async generateMockBrief(userId: string): Promise<BriefItem[]> {
    const briefItems: BriefItem[] = [];

    // Mock Slack items
    for (const thread of mockSlackThreads) {
      if (thread.messages.length < 3) continue;
      const firstMessage = thread.messages[0];
      const replyCount = thread.messages.length - 1;
      const daysWaiting = this.calculateDaysWaiting(firstMessage.ts);

      const urgency = calculateUrgency({
        blockingCount: replyCount >= 3 ? 1 : 0,
        daysWaiting
      });

      briefItems.push({
        user_id: userId,
        type: 'item' as const,
        source: 'slack' as const,
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
      } as any);
    }

    // Mock GitHub items
    for (const pr of mockGitHubPRs) {
      const daysWaiting = this.calculateDaysWaiting(pr.updated_at);
      const isBlocking = pr.requested_reviewers && pr.requested_reviewers.length > 0;

      const urgency = calculateUrgency({
        blockingCount: isBlocking ? 1 : 0,
        daysWaiting,
        sprintRisk: daysWaiting >= 1
      });

      briefItems.push({
        user_id: userId,
        type: 'item' as const,
        source: 'github' as const,
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
      } as any);
    }

    // Mock Jira items
    for (const issue of mockJiraIssues) {
      const daysWaiting = this.calculateDaysWaiting(issue.updated);
      const dueDate = issue.dueDate ? new Date(issue.dueDate) : undefined;

      const urgency = calculateUrgency({
        daysWaiting,
        dueDate,
        sprintRisk: issue.status !== 'Done'
      });

      briefItems.push({
        user_id: userId,
        type: 'item' as const,
        source: 'jira' as const,
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
      } as any);
    }

    // Mock Calendar item
    if (mockCalendarEvents.length > 0) {
      briefItems.push({
        user_id: userId,
        type: 'calendar' as const,
        source: 'calendar' as const,
        urgency: 'fyi' as const,
        text: `Today's schedule: ${mockCalendarEvents.length} event${mockCalendarEvents.length > 1 ? 's' : ''}`,
        metadata: {
          events: mockCalendarEvents.map(e => ({
            time: e.start.dateTime,
            summary: e.summary,
            location: e.location
          }))
        },
        external_id: `calendar-${new Date().toISOString().split('T')[0]}`,
        processed_at: new Date()
      } as any);
    }

    // Save all items
    const savedItems: BriefItem[] = [];
    for (const item of briefItems) {
      try {
        if (item.external_id) {
          const existing = await BriefItemModel.findByExternalId(
            userId,
            item.external_id,
            item.source
          );
          if (existing) {
            savedItems.push(existing);
            continue;
          }
        }
        const saved = await BriefItemModel.create(item);
        savedItems.push(saved);
      } catch (error) {
        console.error(`Error saving mock brief item:`, error);
      }
    }

    return savedItems;
  }

  // Generate brief from Glean MCP
  private async generateBriefFromGleanMCP(userId: string): Promise<BriefItem[]> {
    const gleanConfig = {
      apiUrl: process.env.GLEAN_MCP_URL || process.env.GLEAN_API_URL || '',
      oauthToken: process.env.GLEAN_OAUTH_TOKEN || '',
      apiKey: process.env.GLEAN_API_KEY || ''
    };

    if (!gleanConfig.apiUrl) {
      console.error('GLEAN_MCP_URL or GLEAN_API_URL not set');
      return [];
    }

    const glean = new GleanMCPIntegration(gleanConfig);
    
    try {
      await glean.connect();
      
      // Get urgent items from Glean
      const urgentItems = await glean.getUrgentItems(userId);
      
      // Transform Glean items to BriefItems
      const briefItems: BriefItem[] = urgentItems.map((item: any) => {
        // Map Glean item structure to our BriefItem format
        const urgency = this.mapGleanUrgencyToBriefUrgency(item.urgency || item.priority);
        
        return {
          user_id: userId,
          type: item.type === 'calendar' ? 'calendar' : 'item',
          source: item.source || 'glean',
          urgency,
          text: item.title || item.summary || item.text || '',
          metadata: {
            ...item.metadata,
            glean_id: item.id,
            glean_url: item.url
          },
          external_id: item.id || `glean-${Date.now()}`,
          external_url: item.url,
          processed_at: new Date()
        } as any;
      });

      // Save all items
      const savedItems: BriefItem[] = [];
      for (const item of briefItems) {
        try {
          if (item.external_id) {
            const existing = await BriefItemModel.findByExternalId(
              userId,
              item.external_id,
              item.source
            );
            if (existing) {
              savedItems.push(existing);
              continue;
            }
          }
          const saved = await BriefItemModel.create(item);
          savedItems.push(saved);
        } catch (error) {
          console.error(`Error saving Glean brief item:`, error);
        }
      }

      await glean.disconnect();
      return savedItems;
    } catch (error) {
      console.error('Error generating brief from Glean MCP:', error);
      await glean.disconnect().catch(() => {});
      // Fallback to mock data if Glean fails
      if (USE_MOCK_DATA) {
        console.log('Falling back to mock data due to Glean MCP error');
        return this.generateMockBrief(userId);
      }
      return [];
    }
  }

  private mapGleanUrgencyToBriefUrgency(gleanUrgency: string): 'urgent' | 'attention' | 'followup' | 'fyi' | 'org' {
    const urgencyMap: Record<string, 'urgent' | 'attention' | 'followup' | 'fyi' | 'org'> = {
      'urgent': 'urgent',
      'high': 'urgent',
      'critical': 'urgent',
      'attention': 'attention',
      'medium': 'attention',
      'followup': 'followup',
      'follow-up': 'followup',
      'low': 'fyi',
      'fyi': 'fyi',
      'org': 'org'
    };
    
    return urgencyMap[gleanUrgency?.toLowerCase()] || 'fyi';
  }
}

