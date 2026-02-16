import { WebClient } from '@slack/web-api';
import { BaseIntegration, IntegrationConfig, TokenResponse } from './BaseIntegration';
import { Integration } from '../../models/Integration';

interface SlackMessage {
  text: string;
  thread_ts?: string;
  channel: string;
  user?: string;
  ts: string;
}

interface SlackThread {
  messages: SlackMessage[];
  channel: string;
  thread_ts: string;
}

export class SlackIntegration extends BaseIntegration {
  constructor(config: IntegrationConfig) {
    super('slack', config);
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: 'chat:write,channels:read,groups:read,im:read,users:read,users:read.email',
      redirect_uri: this.config.redirectUri,
      state,
      response_type: 'code'
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri
      })
    });

    const data: any = await response.json();
    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    const data: any = await response.json();
    if (!data.ok) {
      throw new Error(`Slack token refresh error: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in
    };
  }

  // Get Slack client
  async getClient(userId: string): Promise<WebClient> {
    const token = await this.getValidToken(userId);
    return new WebClient(token);
  }

  // Fetch messages requiring attention
  async fetchUrgentMessages(userId: string): Promise<SlackThread[]> {
    const client = await this.getClient(userId);
    const urgentThreads: SlackThread[] = [];

    try {
      // Get all channels user is in
      const channels = await client.conversations.list({ types: 'public_channel,private_channel,im' });
      
      if (!channels.channels) return urgentThreads;

      for (const channel of channels.channels) {
        if (!channel.id) continue;

        try {
          // Get recent messages
          const history = await client.conversations.history({
            channel: channel.id,
            limit: 50
          });

          if (!history.messages) continue;

          // Check for threads with multiple replies
          for (const message of history.messages) {
            if (message.thread_ts || (message.reply_count && message.reply_count > 0)) {
              const threadTs = message.thread_ts || message.ts;
              if (!threadTs) continue;

              const replies = await client.conversations.replies({
                channel: channel.id,
                ts: threadTs,
                limit: 100
              });

              if (replies.messages && replies.messages.length > 2) {
                urgentThreads.push({
                  channel: channel.id || '',
                  thread_ts: threadTs || '',
                  messages: replies.messages.map((m: any) => ({
                    text: m.text || '',
                    thread_ts: m.thread_ts,
                    channel: channel.id || '',
                    user: m.user || '',
                    ts: m.ts || ''
                  }))
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching channel ${channel.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error fetching Slack messages:', error);
    }

    return urgentThreads;
  }

  // Send message
  async sendMessage(userId: string, channel: string, text: string, threadTs?: string): Promise<void> {
    const client = await this.getClient(userId);
    await client.chat.postMessage({
      channel,
      text,
      thread_ts: threadTs
    });
  }

  // Get user info
  async getUserInfo(userId: string, slackUserId: string): Promise<any> {
    const client = await this.getClient(userId);
    const user = await client.users.info({ user: slackUserId });
    return user.user;
  }
}

