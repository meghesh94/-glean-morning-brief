import { Integration, IntegrationModel } from '../../models/Integration';

export interface IntegrationConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export abstract class BaseIntegration {
  protected config: IntegrationConfig;
  protected provider: 'slack' | 'github' | 'jira' | 'calendar';

  constructor(provider: 'slack' | 'github' | 'jira' | 'calendar', config: IntegrationConfig) {
    this.provider = provider;
    this.config = config;
  }

  // Get OAuth authorization URL
  abstract getAuthUrl(state: string): string;

  // Exchange code for tokens
  abstract exchangeCodeForTokens(code: string): Promise<TokenResponse>;

  // Refresh access token
  abstract refreshToken(refreshToken: string): Promise<TokenResponse>;

  // Get stored integration for user
  async getIntegration(userId: string): Promise<Integration | null> {
    return IntegrationModel.findByUserAndProvider(userId, this.provider);
  }

  // Check if token needs refresh
  needsRefresh(integration: Integration): boolean {
    if (!integration.token_expires_at) return false;
    const expiresAt = new Date(integration.token_expires_at);
    const now = new Date();
    // Refresh if expires within 5 minutes
    return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;
  }

  // Get valid access token (refresh if needed)
  async getValidToken(userId: string): Promise<string> {
    let integration = await this.getIntegration(userId);
    if (!integration || !integration.is_active) {
      throw new Error(`${this.provider} integration not found or inactive`);
    }

    if (this.needsRefresh(integration) && integration.refresh_token) {
      try {
        const tokens = await this.refreshToken(integration.refresh_token);
        const expiresAt = tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined;
        
        integration = await IntegrationModel.updateToken(
          integration.id,
          tokens.access_token,
          tokens.refresh_token,
          expiresAt
        );
      } catch (error) {
        console.error(`Failed to refresh ${this.provider} token:`, error);
        // Continue with existing token, might still work
      }
    }

    return integration.access_token;
  }

  // Save integration after OAuth flow
  async saveIntegration(userId: string, tokens: TokenResponse, additionalConfig: Record<string, any> = {}): Promise<Integration> {
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    return IntegrationModel.create({
      user_id: userId,
      provider: this.provider,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      config: additionalConfig,
      is_active: true
    });
  }
}

