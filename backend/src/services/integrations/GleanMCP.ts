// Glean MCP Integration
// Uses Glean's Remote MCP Server to access all integrations through one connection

export interface GleanMCPConfig {
  apiUrl: string; // Glean MCP server URL (e.g., https://your-company.glean.com)
  apiKey?: string; // API key if needed
  oauthToken?: string; // OAuth token from Glean
}

export class GleanMCPIntegration {
  private config: GleanMCPConfig;
  private connected: boolean = false;

  constructor(config: GleanMCPConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // For now, we'll use Glean's REST API
    // MCP SDK integration can be added later when Glean MCP server details are available
    this.connected = true;
    console.log('Connected to Glean (using REST API)');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  // Search company content (Slack, GitHub, Jira, Calendar, etc.)
  async companySearch(query: string, userId: string): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.config.oauthToken) {
        headers['Authorization'] = `Bearer ${this.config.oauthToken}`;
        headers['X-Glean-Auth-Type'] = 'OAUTH';
      } else if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      }

      // Use Glean's search API
      const response = await fetch(`${this.config.apiUrl}/api/v1/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          user_id: userId,
          max_results: 50
        })
      });

      if (!response.ok) {
        throw new Error(`Glean API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Glean company_search error:', error);
      throw error;
    }
  }

  // Get urgent items for morning brief
  async getUrgentItems(userId: string): Promise<any[]> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      // Search for items needing attention across all sources
      const queries = [
        'urgent messages threads blocking me',
        'pull requests assigned to me review',
        'jira tickets assigned to me due soon',
        'calendar events today meetings'
      ];

      const allItems: any[] = [];

      for (const query of queries) {
        try {
          const results = await this.companySearch(query, userId);
          if (results && Array.isArray(results)) {
            // Transform Glean results to our format
            const transformed = results.map((result: any) => ({
              id: result.id || result.url,
              title: result.title || result.summary || result.text,
              text: result.text || result.summary || result.title,
              url: result.url || result.link,
              source: this.detectSource(result),
              type: result.type || 'item',
              urgency: this.detectUrgency(result),
              metadata: {
                ...result.metadata,
                raw: result
              }
            }));
            allItems.push(...transformed);
          }
        } catch (error) {
          console.error(`Error searching for ${query}:`, error);
        }
      }

      // Deduplicate by ID
      const uniqueItems = Array.from(
        new Map(allItems.map(item => [item.id, item])).values()
      );

      return uniqueItems;
    } catch (error) {
      console.error('Glean MCP getUrgentItems error:', error);
      throw error;
    }
  }

  private detectSource(result: any): string {
    const url = result.url || result.link || '';
    if (url.includes('slack.com')) return 'slack';
    if (url.includes('github.com')) return 'github';
    if (url.includes('atlassian.net') || url.includes('jira')) return 'jira';
    if (url.includes('calendar.google.com') || url.includes('calendar')) return 'calendar';
    return result.source || 'glean';
  }

  private detectUrgency(result: any): string {
    // Map Glean's priority/urgency to our levels
    const priority = result.priority || result.urgency || '';
    const lower = priority.toLowerCase();
    
    if (lower.includes('urgent') || lower.includes('critical') || lower.includes('high')) {
      return 'urgent';
    }
    if (lower.includes('medium') || lower.includes('attention')) {
      return 'attention';
    }
    if (lower.includes('follow') || lower.includes('followup')) {
      return 'followup';
    }
    return 'fyi';
  }

  // Chat with Glean AI
  async chat(message: string, userId: string, context?: any): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.config.oauthToken) {
        headers['Authorization'] = `Bearer ${this.config.oauthToken}`;
        headers['X-Glean-Auth-Type'] = 'OAUTH';
      } else if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      }

      const response = await fetch(`${this.config.apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          user_id: userId,
          context: context || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Glean chat API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || data.message || '';
    } catch (error) {
      console.error('Glean MCP chat error:', error);
      throw error;
    }
  }
}

