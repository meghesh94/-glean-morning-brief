# Quick Start with Mock Data

## ✅ Easiest Setup - No OAuth, No Glean, Just Mock Data

Perfect for testing! The app will use realistic mock data for all integrations.

## Setup in Render

Just add **ONE** environment variable:

```
Key: USE_MOCK_DATA
Value: true
```

That's it! 🎉

## What You'll Get

When you generate a brief, you'll see:

### Slack Items (2 threads)
- **Urgent:** Architecture decision thread blocking 3 engineers
- **Attention:** Design doc review needed

### GitHub PRs (2 pull requests)
- **Urgent:** Payment service architecture PR (blocking)
- **Follow-up:** Authentication bug fix PR

### Jira Tickets (3 issues)
- **Urgent:** Payment service architecture decision (due soon)
- **Attention:** API rate limiting implementation
- **FYI:** Database migration (completed)

### Calendar (1 item)
- **Today's schedule:** 5 events
  - 9:30 AM - Standup
  - 10:00 AM - Sprint Planning (3 tickets at risk)
  - 11:30 AM - 1:1 with Sarah (unread design doc)
  - 1:00 PM - Focus Time
  - 2:30 PM - 1:1 with Manager (headcount ask)

## Required Environment Variables (Minimum)

For the app to work, you still need these:

```
DATABASE_URL=<your postgres url>
NODE_ENV=production
PORT=10000
JWT_SECRET=<random string>
OPENAI_API_KEY=<your openai key>
FRONTEND_URL=<your vercel url>
USE_MOCK_DATA=true
```

## How It Works

1. Set `USE_MOCK_DATA=true`
2. User generates brief
3. App uses mock data instead of real integrations
4. Brief shows realistic items from all sources
5. User can test full conversation flow

## Priority Order

The brief generator checks in this order:
1. **Glean MCP** (if `GLEAN_MCP_ENABLED=true`) - Skip this
2. **Mock Data** (if `USE_MOCK_DATA=true`) - ✅ **Use this!**
3. **Individual OAuth** (if integrations connected) - Skip this

## Testing

1. Add `USE_MOCK_DATA=true` to Render
2. Deploy/restart backend
3. Generate brief in frontend
4. See mock data appear!

No OAuth setup needed. No Glean account needed. Just mock data! 🚀

