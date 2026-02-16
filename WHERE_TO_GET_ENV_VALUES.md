# Where to Get Environment Variable Values

## ✅ Required Variables

### 1. `DATABASE_URL`
**Where:** Render Dashboard
1. Go to https://dashboard.render.com
2. Click on your **PostgreSQL database service** (not the web service)
3. Look for **"Internal Database URL"** or **"Connection String"**
4. Copy the entire URL (looks like: `postgresql://user:password@host:port/dbname`)
5. Paste as `DATABASE_URL` value

**Important:** Use "Internal Database URL", NOT "External Database URL"

---

### 2. `NODE_ENV`
**Value:** Just type `production`

---

### 3. `PORT`
**Value:** Just type `10000`

---

### 4. `JWT_SECRET`
**Generate it yourself:**
- **Option 1 (Terminal):**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Copy the output (long random string)

- **Option 2 (Online):**
  - Go to https://randomkeygen.com/
  - Use "CodeIgniter Encryption Keys" - copy any 32+ character string

- **Option 3 (Manual):**
  - Just type any long random string (at least 32 characters)
  - Example: `my-super-secret-jwt-key-2024-production-xyz123`

---

### 5. `OPENAI_API_KEY`
**Where:** OpenAI Platform
1. Go to https://platform.openai.com/api-keys
2. Sign in (or create account)
3. Click **"Create new secret key"**
4. Give it a name (e.g., "Glean Morning Brief")
5. Copy the key (starts with `sk-`)
6. **Important:** Copy it immediately - you won't see it again!

**Note:** You need an OpenAI account. Free tier gives $5 credit.

---

### 6. `FRONTEND_URL`
**Where:** Vercel Dashboard (after deployment)
1. Deploy your frontend to Vercel first
2. Go to https://vercel.com/dashboard
3. Click on your project
4. Copy the URL (e.g., `https://glean-morning-brief.vercel.app`)
5. Paste as `FRONTEND_URL` value

**Temporary:** You can use `http://localhost:5173` for testing, but update to Vercel URL after deployment.

---

## 🔧 Optional: Integration Credentials

### Slack OAuth

**Where:** Slack API Dashboard
1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name: "Glean Morning Brief"
4. Workspace: Select your workspace
5. Click **"Create App"**
6. Go to **"OAuth & Permissions"** in left sidebar
7. Scroll to **"Redirect URLs"**
8. Add: `https://glean-morning-brief.onrender.com/api/integrations/slack/callback`
9. Click **"Save URLs"**
10. Scroll up to **"App Credentials"**
11. Copy **"Client ID"** → `SLACK_CLIENT_ID`
12. Copy **"Client Secret"** → `SLACK_CLIENT_SECRET`
13. Set **"Redirect URI"** → `https://glean-morning-brief.onrender.com/api/integrations/slack/callback`

**Scopes needed:**
- `chat:write`
- `channels:read`
- `groups:read`
- `im:read`
- `users:read`
- `users:read.email`

---

### GitHub OAuth

**Where:** GitHub Developer Settings
1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. **Application name:** "Glean Morning Brief"
4. **Homepage URL:** `https://glean-morning-brief.vercel.app`
5. **Authorization callback URL:** `https://glean-morning-brief.onrender.com/api/integrations/github/callback`
6. Click **"Register application"**
7. Copy **"Client ID"** → `GITHUB_CLIENT_ID`
8. Click **"Generate a new client secret"**
9. Copy **"Client secret"** → `GITHUB_CLIENT_SECRET`
10. Set **"Redirect URI"** → `https://glean-morning-brief.onrender.com/api/integrations/github/callback`

---

### Jira OAuth

**Where:** Atlassian Developer Console
1. Go to https://developer.atlassian.com/console/myapps/
2. Click **"Create"** → **"OAuth 2.0 integration"**
3. **Name:** "Glean Morning Brief"
4. **Authorization callback URL:** `https://glean-morning-brief.onrender.com/api/integrations/jira/callback`
5. Click **"Create"**
6. Copy **"Client ID"** → `JIRA_CLIENT_ID`
7. Copy **"Client secret"** → `JIRA_CLIENT_SECRET`
8. Set **"Redirect URI"** → `https://glean-morning-brief.onrender.com/api/integrations/jira/callback`
9. **Base URL:** Your Jira instance URL (e.g., `https://yourcompany.atlassian.net`) → `JIRA_BASE_URL`

**Note:** You need admin access to your Jira instance to create OAuth apps.

---

### Google Calendar OAuth

**Where:** Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Go to **"APIs & Services"** → **"Credentials"**
4. Click **"Create Credentials"** → **"OAuth client ID"**
5. **Application type:** "Web application"
6. **Name:** "Glean Morning Brief"
7. **Authorized redirect URIs:** Add `https://glean-morning-brief.onrender.com/api/integrations/google/callback`
8. Click **"Create"**
9. Copy **"Client ID"** → `GOOGLE_CLIENT_ID`
10. Copy **"Client secret"** → `GOOGLE_CLIENT_SECRET`
11. Set **"Redirect URI"** → `https://glean-morning-brief.onrender.com/api/integrations/google/callback`

**Enable APIs:**
- Go to **"APIs & Services"** → **"Library"**
- Search for "Google Calendar API"
- Click **"Enable"**

---

## 📝 Quick Checklist

**Minimum to get started:**
- [ ] `DATABASE_URL` - From Render PostgreSQL service
- [ ] `NODE_ENV` - Type `production`
- [ ] `PORT` - Type `10000`
- [ ] `JWT_SECRET` - Generate random string
- [ ] `OPENAI_API_KEY` - From https://platform.openai.com/api-keys
- [ ] `FRONTEND_URL` - From Vercel (or `http://localhost:5173` for testing)

**For integrations (add later):**
- [ ] Slack credentials - From https://api.slack.com/apps
- [ ] GitHub credentials - From https://github.com/settings/developers
- [ ] Jira credentials - From https://developer.atlassian.com/console/myapps/
- [ ] Google credentials - From https://console.cloud.google.com/

---

## 🚀 Getting Started Order

1. **First:** Set up the 6 required variables (app works without integrations)
2. **Deploy:** Test that backend starts successfully
3. **Later:** Add integration credentials one by one as needed

You don't need all integrations at once - add them as you want to test each one!

