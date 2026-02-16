# How to Connect Integrations

## Current Status

**The backend has OAuth integration support, but you need to:**

1. **Set up OAuth credentials** (optional - only if you want real connections)
2. **Add a UI** to connect integrations (currently missing)

## Option 1: Quick Test (Without OAuth Setup)

For now, the app works without integrations. You'll see an empty brief, which is expected.

## Option 2: Add Integration Connection UI

I can add a simple UI to connect integrations. It would:
- Show a list of available integrations (Slack, GitHub, Jira, Calendar)
- Have "Connect" buttons for each
- Handle OAuth flow

**Would you like me to add this UI?**

## Option 3: Set Up Real OAuth (For Production)

If you want to connect real integrations, you need:

### 1. Set Up OAuth Apps

**Slack:**
1. Go to https://api.slack.com/apps
2. Create New App → "From scratch"
3. OAuth & Permissions → Add Redirect URL: `https://glean-morning-brief.onrender.com/api/integrations/slack/callback`
4. Copy Client ID and Client Secret

**GitHub:**
1. Go to https://github.com/settings/developers
2. New OAuth App
3. Authorization callback URL: `https://glean-morning-brief.onrender.com/api/integrations/github/callback`
4. Copy Client ID and Client Secret

**Jira:**
1. Go to https://developer.atlassian.com/console/myapps/
2. Create app → OAuth 2.0 (3LO)
3. Add callback URL: `https://glean-morning-brief.onrender.com/api/integrations/jira/callback`
4. Copy Client ID and Secret

**Google Calendar:**
1. Go to https://console.cloud.google.com/
2. Create project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Authorized redirect URI: `https://glean-morning-brief.onrender.com/api/integrations/google/callback`
5. Copy Client ID and Secret

### 2. Add to Render Environment Variables

In Render dashboard → Your backend service → Environment tab, add:

```env
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=https://glean-morning-brief.onrender.com/api/integrations/slack/callback

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://glean-morning-brief.onrender.com/api/integrations/github/callback

JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret
JIRA_REDIRECT_URI=https://glean-morning-brief.onrender.com/api/integrations/jira/callback
JIRA_BASE_URL=https://your-domain.atlassian.net

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://glean-morning-brief.onrender.com/api/integrations/google/callback
```

### 3. Redeploy Backend

After adding environment variables, Render will auto-redeploy.

## Recommendation

**For now (testing):**
- The app works fine without integrations
- You'll see empty brief (expected)
- No OAuth setup needed

**For production/demo:**
- Add OAuth credentials to Render
- I can add a UI to connect integrations
- Then users can connect their accounts

**Would you like me to:**
1. Add a simple integration connection UI? (Quick)
2. Or just document how to set up OAuth? (You do it manually)

Let me know what you prefer!

