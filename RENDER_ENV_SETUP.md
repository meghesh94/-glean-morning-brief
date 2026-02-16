# Render Environment Variables Setup

## Where to Add Environment Variables in Render

1. **Go to your Render dashboard:** https://dashboard.render.com
2. **Click on your backend web service** (the one you created, not the PostgreSQL database)
3. **Click on "Environment" tab** (in the left sidebar)
4. **Click "Add Environment Variable"** button
5. **Add each variable one by one:**

## Required Environment Variables

Add these in Render → Your Backend Service → Environment tab:

### 1. Database Connection
```
Key: DATABASE_URL
Value: <paste your Internal Database URL from PostgreSQL service>
```
**Important:** Use the "Internal Database URL" from your PostgreSQL service, not the external one.

### 2. Server Configuration
```
Key: NODE_ENV
Value: production
```

```
Key: PORT
Value: 10000
```
(Render uses port 10000 by default)

### 3. Authentication
```
Key: JWT_SECRET
Value: <generate a random string>
```
**Generate one:**
- Run in terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Or use any long random string

### 4. OpenAI
```
Key: OPENAI_API_KEY
Value: sk-your-actual-openai-api-key
```
Get from: https://platform.openai.com/api-keys

### 5. Frontend URL (Update after Vercel deploy)
```
Key: FRONTEND_URL
Value: https://your-vercel-app.vercel.app
```
**Update this after you deploy to Vercel** with your actual Vercel URL.

## Optional: Integration Credentials

Add these only if you want to test integrations:

### Slack
```
Key: SLACK_CLIENT_ID
Value: your-slack-client-id

Key: SLACK_CLIENT_SECRET
Value: your-slack-client-secret

Key: SLACK_REDIRECT_URI
Value: https://your-backend.onrender.com/api/integrations/slack/callback
```

### GitHub
```
Key: GITHUB_CLIENT_ID
Value: your-github-client-id

Key: GITHUB_CLIENT_SECRET
Value: your-github-client-secret

Key: GITHUB_REDIRECT_URI
Value: https://your-backend.onrender.com/api/integrations/github/callback
```

### Jira
```
Key: JIRA_CLIENT_ID
Value: your-jira-client-id

Key: JIRA_CLIENT_SECRET
Value: your-jira-client-secret

Key: JIRA_REDIRECT_URI
Value: https://your-backend.onrender.com/api/integrations/jira/callback

Key: JIRA_BASE_URL
Value: https://your-domain.atlassian.net
```

### Google Calendar
```
Key: GOOGLE_CLIENT_ID
Value: your-google-client-id

Key: GOOGLE_CLIENT_SECRET
Value: your-google-client-secret

Key: GOOGLE_REDIRECT_URI
Value: https://your-backend.onrender.com/api/integrations/google/callback
```

## Quick Steps

1. Go to Render dashboard
2. Click your backend service
3. Click "Environment" tab
4. Add `DATABASE_URL` with your database URL
5. Add `NODE_ENV=production`
6. Add `PORT=10000`
7. Add `JWT_SECRET` (generate one)
8. Add `OPENAI_API_KEY`
9. Add `FRONTEND_URL` (update after Vercel deploy)
10. Click "Save Changes"
11. Render will automatically redeploy with new variables

## How to Get Database URL from Render

1. In Render dashboard, click on your **PostgreSQL database service** (not the web service)
2. Look for "Internal Database URL" or "Connection String"
3. Copy that entire URL
4. Paste it as the value for `DATABASE_URL` in your backend service environment variables

**Important:** 
- Use "Internal Database URL" (starts with `postgresql://`)
- Don't use "External Database URL" - that won't work from Render's network

## After Adding Variables

1. Render will automatically redeploy your service
2. Wait for deployment to complete
3. Check logs to make sure it started successfully
4. Test health endpoint: `https://your-backend.onrender.com/health`

