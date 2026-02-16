import { BaseIntegration, IntegrationConfig, TokenResponse } from './BaseIntegration';

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee?: { displayName: string; emailAddress: string };
  created: string;
  updated: string;
  dueDate?: string;
  priority?: string;
  url: string;
}

export class JiraIntegration extends BaseIntegration {
  private baseUrl: string;

  constructor(config: IntegrationConfig, baseUrl: string) {
    super('jira', config);
    this.baseUrl = baseUrl;
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: 'read:jira-work write:jira-work',
      redirect_uri: this.config.redirectUri,
      state,
      response_type: 'code',
      audience: 'api.atlassian.com'
    });
    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri
      })
    });

    const data: any = await response.json();
    if (data.error) {
      throw new Error(`Jira OAuth error: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken
      })
    });

    const data: any = await response.json();
    if (data.error) {
      throw new Error(`Jira token refresh error: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in
    };
  }

  async makeRequest(userId: string, endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const token = await this.getValidToken(userId);
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Fetch issues assigned to user
  async fetchAssignedIssues(userId: string): Promise<JiraIssue[]> {
    try {
      const data = await this.makeRequest(
        userId,
        '/search?jql=assignee=currentUser() AND status != Done ORDER BY updated DESC&maxResults=50'
      );

      return data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description || '',
        status: issue.fields.status.name,
        assignee: issue.fields.assignee ? {
          displayName: issue.fields.assignee.displayName,
          emailAddress: issue.fields.assignee.emailAddress
        } : undefined,
        created: issue.fields.created,
        updated: issue.fields.updated,
        dueDate: issue.fields.duedate,
        priority: issue.fields.priority?.name,
        url: `${this.baseUrl}/browse/${issue.key}`
      }));
    } catch (error) {
      console.error('Error fetching Jira issues:', error);
      return [];
    }
  }

  // Get sprint data
  async getSprintData(userId: string, boardId: string): Promise<any> {
    try {
      const sprints = await this.makeRequest(userId, `/board/${boardId}/sprint?state=active`);
      return sprints.values[0] || null;
    } catch (error) {
      console.error('Error fetching sprint data:', error);
      return null;
    }
  }
}

