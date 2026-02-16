import { BaseIntegration, IntegrationConfig, TokenResponse } from './BaseIntegration';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  htmlLink: string;
}

export class CalendarIntegration extends BaseIntegration {
  constructor(config: IntegrationConfig) {
    super('calendar', config);
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      redirect_uri: this.config.redirectUri,
      state,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri
      })
    });

    const data: any = await response.json();
    if (data.error) {
      throw new Error(`Google OAuth error: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    const data: any = await response.json();
    if (data.error) {
      throw new Error(`Google token refresh error: ${data.error}`);
    }

    return {
      access_token: data.access_token,
      refresh_token: refreshToken, // Google returns same refresh token
      expires_in: data.expires_in
    };
  }

  async makeRequest(userId: string, endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const token = await this.getValidToken(userId);
    const url = `https://www.googleapis.com/calendar/v3${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Fetch today's events
  async fetchTodaysEvents(userId: string): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const data = await this.makeRequest(
        userId,
        `/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`
      );

      return (data.items || []).map((event: any) => ({
        id: event.id,
        summary: event.summary || 'No title',
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees?.map((a: any) => ({
          email: a.email,
          displayName: a.displayName
        })),
        htmlLink: event.htmlLink
      }));
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }
}

