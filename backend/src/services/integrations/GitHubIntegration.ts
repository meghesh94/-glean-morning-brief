import { Octokit } from '@octokit/rest';
import { BaseIntegration, IntegrationConfig, TokenResponse } from './BaseIntegration';

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  user: { login: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  head: { ref: string };
  base: { ref: string };
  additions?: number;
  deletions?: number;
  changed_files?: number;
  review_comments?: number;
  requested_reviewers?: Array<{ login: string }>;
}

export class GitHubIntegration extends BaseIntegration {
  constructor(config: IntegrationConfig) {
    super('github', config);
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: 'repo,read:org,read:user',
      redirect_uri: this.config.redirectUri,
      state,
      response_type: 'code'
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri
      })
    });

    const data: any = await response.json();
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    // GitHub doesn't support refresh tokens for OAuth apps
    // Return existing token (caller should handle re-auth)
    throw new Error('GitHub does not support token refresh. Re-authentication required.');
  }

  async getClient(userId: string): Promise<Octokit> {
    const token = await this.getValidToken(userId);
    return new Octokit({ auth: token });
  }

  // Fetch PRs requiring review
  async fetchPRsNeedingReview(userId: string): Promise<GitHubPR[]> {
    const client = await this.getClient(userId);
    const prs: GitHubPR[] = [];

    try {
      // Get user's organizations and repos
      const { data: user } = await client.rest.users.getAuthenticated();
      const { data: orgs } = await client.rest.orgs.listForAuthenticatedUser();

      // Search for PRs assigned to user
      const searchQuery = `is:pr is:open review-requested:${user.login}`;
      const { data } = await client.rest.search.issuesAndPullRequests({
        q: searchQuery,
        sort: 'updated',
        order: 'desc',
        per_page: 50
      });

      for (const item of data.items) {
        if (item.pull_request) {
          const { data: pr } = await client.rest.pulls.get({
            owner: item.repository_url.split('/').slice(-2)[0],
            repo: item.repository_url.split('/').slice(-1)[0],
            pull_number: item.number
          });

          prs.push({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            body: pr.body || '',
            state: pr.state,
            user: { login: pr.user?.login || '' },
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            html_url: pr.html_url,
            head: { ref: pr.head.ref },
            base: { ref: pr.base.ref },
            additions: pr.additions,
            deletions: pr.deletions,
            changed_files: pr.changed_files,
            review_comments: pr.review_comments,
            requested_reviewers: pr.requested_reviewers?.map(r => ({ login: typeof r === 'string' ? r : r.login }))
          });
        }
      }
    } catch (error) {
      console.error('Error fetching GitHub PRs:', error);
    }

    return prs;
  }

  // Approve PR
  async approvePR(userId: string, owner: string, repo: string, pullNumber: number): Promise<void> {
    const client = await this.getClient(userId);
    await client.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event: 'APPROVE'
    });
  }

  // Post comment on PR
  async commentOnPR(userId: string, owner: string, repo: string, pullNumber: number, body: string): Promise<void> {
    const client = await this.getClient(userId);
    await client.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body
    });
  }
}

