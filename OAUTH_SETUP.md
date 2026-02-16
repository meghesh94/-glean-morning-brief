# OAuth Setup Guide

## Do You Need OAuth Credentials?

**Short answer:** No, they're optional! The app works without them.

**When you DO need them:**
- If you want users to connect Slack, GitHub, Jira, or Calendar
- If you want to test the integration features
- For production use with real integrations

**When you DON'T need them:**
- Just testing the basic app functionality
- Testing authentication and brief generation with mock data
- Initial deployment and setup

## Required vs Optional

### ✅ Required (Must Have)
These are needed for the app to work at all:

```env
DATABASE_URL=<your database URL>
NODE_ENV=production
PORT=10000
JWT_SECRET=<random string>
OPENAI_API_KEY=<your OpenAI key>
FRONTEND_URL=<your Vercel URL>
```

### ⚠️ Optional (Only if Using Integrations)
These are only needed if users will connect integrations:

**Slack:**
```env
SLACK_CLIENT_ID=<from Slack app settings>
SLACK_CLIENT_SECRET=<from Slack app settings>
SLACK_REDIRECT_URI=https://glean-morning-brief.onrender.com/api/integrations/slack/callback
```

**GitHub:**
```env
GITHUB_CLIENT_ID=<from GitHub OAuth app>
GITHUB_CLIENT_SECRET=<from GitHub OAuth app>
GITHUB_REDIRECT_URI=https://glean-morning-brief.onrender.com/api/integrations/github/callback
```

**Jira:**
```env
JIRA_CLIENT_ID=<from Atlassian app>
JIRA_CLIENT_SECRET=<from Atlassian app>
JIRA_REDIRECT_URI=https://glean-morning-brief.onrender.com/api/integrations/jira/callback
JIRA_BASE_URL=https://your-domain.atlassian.net
```

**Google Calendar:**
```env
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=https://glean-morning-brief.onrender.com/api/integrations/google/callback
```

## How to Get OAuth Credentials

### Slack
1. Go to https://api.slack.com/apps
2. Create New App → "From scratch"
3. OAuth & Permissions → Add Redirect URL: `https://glean-morning-brief.onrender.com/api/integrations/slack/callback`
4. Copy Client ID and Client Secret

### GitHub
1. Go to https://github.com/settings/developers
2. New OAuth App
3. Authorization callback URL: `https://glean-morning-brief.onrender.com/api/integrations/github/callback`
4. Copy Client ID and Client Secret

### Jira
1. Go to https://developer.atlassian.com/console/myapps/
2. Create app → OAuth 2.0 (3LO)
3. Add callback URL: `https://glean-morning-brief.onrender.com/api/integrations/jira/callback`
4. Copy Client ID and Secret

### Google Calendar
1. Go to https://console.cloud.google.com/
2. Create project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Authorized redirect URI: `https://glean-morning-brief.onrender.com/api/integrations/google/callback`
5. Copy Client ID and Secret

## Recommendation

**For initial deployment:**
- ✅ Skip OAuth credentials for now
- ✅ Get the app working first
- ✅ Test basic functionality
- ✅ Add OAuth later when you need integrations

**For production/demo:**
- Add OAuth credentials so users can connect their apps
- Test each integration one at a time

## Your Current Status

Since your backend is already deployed at `https://glean-morning-brief.onrender.com`, you can:

1. **Deploy frontend to Vercel first** (no OAuth needed)
2. **Test the app** (auth, brief generation, AI conversation)
3. **Add OAuth later** when you want to test integrations

The app will work fine without OAuth - users just won't see the "Connect Slack/GitHub/etc" options until you add the credentials.

