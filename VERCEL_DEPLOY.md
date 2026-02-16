# Vercel Deployment Guide (Frontend) + Render (Backend)

Vercel for frontend + Render for backend is a great combination!

## Step 1: Deploy Backend to Render

### 1.1 Sign up for Render
- Go to https://render.com
- Sign up with GitHub (free tier available)

### 1.2 Create PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Name it: `glean-brief-db`
3. Select free tier (or paid if you prefer)
4. Click "Create Database"
5. **Important:** Copy the "Internal Database URL" - you'll need this!

### 1.3 Deploy Backend Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `glean-brief-backend` (or any name)
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for better performance)

### 1.4 Add Environment Variables
In Render dashboard → Your backend service → Environment tab, add:

```env
NODE_ENV=production
DATABASE_URL=<Internal Database URL from PostgreSQL service>
JWT_SECRET=<generate a random string>
OPENAI_API_KEY=<your OpenAI API key>
FRONTEND_URL=https://your-vercel-app.vercel.app
PORT=10000
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:** Render uses port 10000 by default, but our code uses 3001. Update `backend/src/index.ts` or set `PORT=10000` in env (we'll handle this).

### 1.5 Update OAuth Redirect URIs
Get your Render backend URL (something like `your-app.onrender.com`), then add:

```env
SLACK_REDIRECT_URI=https://your-app.onrender.com/api/integrations/slack/callback
GITHUB_REDIRECT_URI=https://your-app.onrender.com/api/integrations/github/callback
JIRA_REDIRECT_URI=https://your-app.onrender.com/api/integrations/jira/callback
GOOGLE_REDIRECT_URI=https://your-app.onrender.com/api/integrations/google/callback
```

Add these to Render environment variables too.

### 1.6 Run Database Migrations
After first deployment:
1. Go to your backend service in Render
2. Click "Shell" tab (or use "Manual Deploy" → "Run Command")
3. Run: `npm run migrate`
   - Or if that doesn't work: `npx tsx src/db/migrate.ts`

### 1.7 Get Your Backend URL
- Render will give you a URL like: `https://your-app.onrender.com`
- Note this URL - you'll need it for Vercel

**Note:** Free tier on Render spins down after inactivity. First request may be slow (~30s). Paid tier stays warm.

## Step 2: Deploy Frontend to Vercel

### 2.1 Sign up for Vercel
- Go to https://vercel.com
- Sign up with GitHub

### 2.2 Import Your Project
1. Click "Add New" → "Project"
2. Import your GitHub repository
3. Vercel will auto-detect it's a Vite project

### 2.3 Configure Build Settings
- **Framework Preset:** Vite (auto-detected)
- **Root Directory:** `./` (root of repo)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `dist` (auto-detected)

### 2.4 Add Environment Variable
In Vercel project settings → Environment Variables, add:

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

Replace `your-backend.onrender.com` with your actual Render backend URL.

### 2.5 Deploy!
- Click "Deploy"
- Vercel will build and deploy your frontend
- You'll get a URL like: `https://your-app.vercel.app`

## Step 3: Update Backend CORS

Go back to Render backend environment variables and update:

```env
FRONTEND_URL=https://your-app.vercel.app
```

Replace with your actual Vercel URL.

## Step 4: Fix Port Issue (Important!)

Render expects the app to listen on the port from `PORT` environment variable. Let's update the backend:

The backend should already use `process.env.PORT || 3001`, which is good. But make sure Render sets `PORT=10000` in environment variables (which we did above).

If you see connection errors, check that:
- Backend is listening on the correct port
- Health check works: `https://your-backend.onrender.com/health`

## Step 5: Test Everything

1. **Backend health check:**
   - Visit: `https://your-backend.onrender.com/health`
   - Should return: `{"status":"ok",...}`
   - **Note:** First request on free tier may take ~30 seconds (cold start)

2. **Frontend:**
   - Visit your Vercel URL
   - Should load the app
   - Try registering/logging in

3. **API connection:**
   - Open browser console on your Vercel app
   - Check network tab - API calls should go to Render backend

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_URL` in Vercel matches your Render URL
- Make sure Render backend is running (check Render dashboard)
- Verify CORS: `FRONTEND_URL` in Render should match Vercel URL
- **Free tier:** First request may timeout - wait ~30s and try again

### Database connection errors
- Check `DATABASE_URL` in Render uses "Internal Database URL" (not external)
- Make sure migrations ran: `npm run migrate` in Render shell
- Verify PostgreSQL service is running in Render

### OAuth not working
- Verify redirect URIs match exactly (including https://)
- Check OAuth credentials in Render env vars
- Make sure you updated redirect URIs in your OAuth app settings (Slack, GitHub, etc.)

### Backend not responding
- **Free tier:** Service may be sleeping - first request takes ~30s
- Check Render logs for errors
- Verify `PORT` environment variable is set to `10000`
- Check build logs for compilation errors

### Port errors
- Make sure `PORT=10000` is set in Render environment variables
- Backend code should use `process.env.PORT || 3001` (already does)

## Cost

- **Vercel:** Free tier (perfect for frontend)
- **Render:** Free tier available (with cold starts), $7/month for always-on
- **Total:** Free (with cold starts) or ~$7/month (always-on)

## Render Free Tier Notes

- **Cold starts:** Service spins down after 15 min inactivity
- **First request:** May take 30-60 seconds to wake up
- **Always-on:** Upgrade to paid plan ($7/month) to avoid cold starts
- **Database:** Free tier PostgreSQL has 90-day retention limit

## Custom Domain (Optional)

### Vercel Domain
- Project Settings → Domains
- Add your domain
- Update DNS as instructed

### Render Domain
- Service Settings → Custom Domain
- Add your domain
- Update DNS as instructed

### Update Both
- Update `FRONTEND_URL` in Render to your custom domain
- Update `VITE_API_URL` in Vercel to your custom backend domain
- Update OAuth redirect URIs if using custom domains

## Quick Checklist

- [ ] Render PostgreSQL database created
- [ ] Render backend web service deployed
- [ ] Database migrations run in Render shell
- [ ] Backend environment variables set (including PORT=10000)
- [ ] Backend URL noted
- [ ] Vercel frontend deployed
- [ ] `VITE_API_URL` set in Vercel
- [ ] `FRONTEND_URL` updated in Render
- [ ] Health check works (may be slow on free tier)
- [ ] Frontend loads
- [ ] Can register/login

You're live! 🎉

**Pro tip:** For production, consider Render's paid plan ($7/month) to avoid cold starts.
