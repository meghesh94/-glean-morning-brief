# Deployment Guide

This guide covers deploying the Glean Morning Brief application to various hosting platforms.

## Quick Deploy Options

### Option 1: Railway (Easiest - Recommended)

Railway makes it super easy to deploy with PostgreSQL included.

1. **Sign up at** https://railway.app
2. **Create a new project**
3. **Add PostgreSQL service** (Railway will create it automatically)
4. **Add your backend:**
   - Connect your GitHub repo
   - Select the `backend` folder as root
   - Railway will auto-detect Node.js
   - Add environment variables (see below)
5. **Add your frontend:**
   - Add another service
   - Select root folder (for frontend)
   - Add environment variable: `VITE_API_URL=https://your-backend-url.railway.app/api`
6. **Run migrations:**
   - In Railway, open backend service terminal
   - Run: `npm run migrate`

**Environment Variables for Railway:**
- Copy all from `backend/.env.example`
- Get `DATABASE_URL` from Railway's PostgreSQL service (it's auto-generated)
- Set `FRONTEND_URL` to your frontend Railway URL

### Option 2: Render

1. **Sign up at** https://render.com
2. **Create PostgreSQL database:**
   - New → PostgreSQL
   - Note the connection string
3. **Deploy backend:**
   - New → Web Service
   - Connect GitHub repo
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add environment variables
4. **Deploy frontend:**
   - New → Static Site
   - Connect GitHub repo
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`

### Option 3: Vercel (Frontend) + Render (Backend) ⭐ RECOMMENDED

**Best for production - See [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) for complete step-by-step guide!**

Quick steps:
1. **Deploy backend** to Render (create PostgreSQL database first)
2. **Deploy frontend to Vercel:**
   - Sign up at https://vercel.com
   - Import your GitHub repo
   - Framework Preset: Vite (auto-detected)
   - Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`
   - Deploy!

**Full guide:** See `VERCEL_DEPLOY.md` for detailed instructions with Render setup.

### Option 4: Docker Compose (VPS/Cloud Server)

For deploying to your own server (DigitalOcean, AWS EC2, etc.):

1. **Clone repo on your server**
2. **Create `.env` file** with all variables
3. **Run:**
   ```bash
   docker-compose up -d
   ```
4. **Run migrations:**
   ```bash
   docker-compose exec backend npm run migrate
   ```

## Environment Variables for Production

Make sure to set these in your hosting platform:

### Required
```env
NODE_ENV=production
DATABASE_URL=<from your database service>
JWT_SECRET=<generate a strong random string>
OPENAI_API_KEY=<your OpenAI key>
FRONTEND_URL=<your frontend URL>
```

### Integration OAuth URLs

**Important:** Update OAuth redirect URIs in your integration apps:

- **Slack:** https://your-backend-url.com/api/integrations/slack/callback
- **GitHub:** https://your-backend-url.com/api/integrations/github/callback
- **Jira:** https://your-backend-url.com/api/integrations/jira/callback
- **Google:** https://your-backend-url.com/api/integrations/google/callback

Also update these in your `.env`:
```env
SLACK_REDIRECT_URI=https://your-backend-url.com/api/integrations/slack/callback
GITHUB_REDIRECT_URI=https://your-backend-url.com/api/integrations/github/callback
# etc...
```

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Backend health check works: `https://your-backend-url/health`
- [ ] Frontend can connect to backend API
- [ ] OAuth redirect URIs updated in integration apps
- [ ] Environment variables all set correctly
- [ ] HTTPS enabled (most platforms do this automatically)
- [ ] CORS configured correctly (FRONTEND_URL set)

## Custom Domain Setup

### Railway/Render
- Go to your service settings
- Add custom domain
- Update DNS records as instructed
- Update `FRONTEND_URL` in backend env vars

### Vercel
- Project Settings → Domains
- Add your domain
- Update DNS records
- Update `VITE_API_URL` in frontend env vars

## Monitoring & Logs

Most platforms provide:
- **Logs:** View in dashboard
- **Metrics:** CPU, memory usage
- **Alerts:** Set up for errors

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` is correct
- Ensure database is accessible from your backend
- Check firewall/security groups

### CORS Errors
- Verify `FRONTEND_URL` matches your actual frontend URL
- Check for trailing slashes

### OAuth Not Working
- Verify redirect URIs match exactly
- Check OAuth credentials are correct
- Ensure HTTPS is enabled (OAuth requires HTTPS)

## Cost Estimates

- **Railway:** ~$5-20/month (includes database)
- **Render:** Free tier available, ~$7/month for production
- **Vercel:** Free tier for frontend
- **DigitalOcean:** ~$12/month for basic droplet

## Recommended Stack for Production

- **Frontend:** Vercel (free tier, excellent performance)
- **Backend:** Railway (easy PostgreSQL, good DX)
- **Database:** Included with Railway/Render
- **Total:** ~$5-10/month for small scale

