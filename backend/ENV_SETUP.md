# Environment Variables Setup Guide

Copy this template into your `.env` file in the `backend` directory and fill in your actual values.

## Required for Basic Setup

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database - Replace with your PostgreSQL connection string
DATABASE_URL=postgresql://username:password@localhost:5432/glean_brief
# Example: postgresql://postgres:mypassword@localhost:5432/glean_brief

# JWT Secret - Generate a random string for production
JWT_SECRET=your-super-secret-jwt-key-change-in-production
# You can generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenAI API Key - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## Optional (for Integrations)

These are only needed if you want to test the integrations. You can add them later.

```env
# Slack Integration
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3001/api/integrations/slack/callback

# GitHub Integration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3001/api/integrations/github/callback

# Jira Integration
JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret
JIRA_REDIRECT_URI=http://localhost:3001/api/integrations/jira/callback
JIRA_BASE_URL=https://your-domain.atlassian.net

# Google Calendar Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/google/callback

# Redis (optional - only needed for background workers)
REDIS_URL=redis://localhost:6379
```

## Quick Start (Minimum Required)

For now, you only need these to get started:

1. **DATABASE_URL** - Your PostgreSQL connection string
2. **JWT_SECRET** - Any random string (change later for production)
3. **OPENAI_API_KEY** - Your OpenAI API key
4. **FRONTEND_URL** - Keep as `http://localhost:5173` for development

The integration credentials can be added later when you want to test those features.

