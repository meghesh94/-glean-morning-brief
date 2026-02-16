# Glean MCP Integration Setup

## Overview

Instead of setting up individual OAuth flows for Slack, GitHub, Jira, and Calendar, you can use **Glean MCP** which provides access to all integrations through a single connection.

## Benefits

✅ **One integration instead of four** - Connect to Glean MCP, get access to everything  
✅ **No OAuth setup needed** - Glean handles authentication  
✅ **Enterprise-ready** - Glean already has 100+ connectors  
✅ **Simpler architecture** - One API call instead of multiple  

## Setup

### 1. Get Glean MCP Access

You need:
- **Glean instance URL** (e.g., `https://your-company.glean.com`)
- **OAuth token** OR **API key** from Glean

**How to get:**
1. Contact your Glean administrator
2. Go to Glean Settings → MCP Configurator
3. Enable Remote MCP Server
4. Generate OAuth token or API key

### 2. Environment Variables

Add these to Render:

```env
# Enable Glean MCP
GLEAN_MCP_ENABLED=true

# Glean instance URL
GLEAN_MCP_URL=https://your-company.glean.com
# OR use GLEAN_API_URL (same thing)

# Authentication (choose one):
# Option 1: OAuth token (recommended)
GLEAN_OAUTH_TOKEN=your-oauth-token-here

# Option 2: API key
GLEAN_API_KEY=your-api-key-here
```

### 3. How It Works

When `GLEAN_MCP_ENABLED=true`:
- Brief generator connects to Glean MCP
- Searches for urgent items across all connected apps
- Glean returns unified results from Slack, GitHub, Jira, Calendar, etc.
- No need for individual OAuth credentials

## Priority Order

The brief generator uses this priority:

1. **Glean MCP** (if `GLEAN_MCP_ENABLED=true`)
2. **Mock Data** (if `USE_MOCK_DATA=true`)
3. **Individual Integrations** (Slack, GitHub, Jira, Calendar OAuth)

## API Endpoints Used

Glean MCP integration uses:
- `/api/v1/search` - Search across all connected apps
- `/api/v1/chat` - Chat with Glean AI (optional)

## Fallback

If Glean MCP fails:
- Falls back to mock data (if enabled)
- Or returns empty brief

## Testing

1. Set `GLEAN_MCP_ENABLED=true` in Render
2. Add `GLEAN_MCP_URL` and authentication
3. Generate brief - it will use Glean MCP
4. Check logs to see Glean API calls

## Notes

- Glean MCP requires access to your Glean instance
- OAuth token is preferred over API key (more secure)
- Make sure your Glean instance has the apps you need connected
- Contact Glean support if you need help setting up MCP access

