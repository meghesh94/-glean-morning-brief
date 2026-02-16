# Fix: Vercel Loading Dummy Data

## The Problem

Vercel is showing placeholder/dummy data because **the API call is failing** and the frontend falls back to `CONVO` data.

## Why It's Failing

The frontend tries to call the backend API, but it's likely failing because:

1. ❌ **`VITE_API_URL` not set in Vercel** - Frontend doesn't know where the backend is
2. ❌ **Backend not accessible** - CORS or network issue
3. ❌ **Backend not running** - Render service might be sleeping (free tier)

## How to Fix

### Step 1: Set Environment Variable in Vercel

1. Go to **Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
2. Add:
   ```
   Name: VITE_API_URL
   Value: https://glean-morning-brief.onrender.com/api
   ```
3. **Important:** Make sure to select **Production**, **Preview**, and **Development** environments
4. Click **Save**

### Step 2: Redeploy Frontend

After adding the environment variable:
1. Go to **Deployments** tab
2. Click the **3 dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger auto-deploy

### Step 3: Verify Backend is Running

Check if your Render backend is awake:
```bash
curl https://glean-morning-brief.onrender.com/health
```

Should return: `{"status":"ok","timestamp":"..."}`

If it's sleeping (free tier), the first request will take ~30 seconds.

### Step 4: Check Browser Console

Open your Vercel app and check the browser console (F12):
- Look for errors like:
  - `Failed to load brief: Network Error` = Backend not accessible
  - `Failed to load brief: 401 Unauthorized` = Auth issue
  - `Failed to load brief: 404 Not Found` = Wrong API URL

## What I Changed

I updated the error handling to show **actual error messages** instead of silently falling back to dummy data. Now you'll see:
- Clear error messages explaining what's wrong
- Instructions on how to fix it
- No more silent fallback to placeholder data

## Quick Checklist

- [ ] `VITE_API_URL` set in Vercel environment variables
- [ ] Value is: `https://glean-morning-brief.onrender.com/api`
- [ ] Frontend redeployed after setting env var
- [ ] Backend is running (check Render dashboard)
- [ ] Backend health check works: `/health` endpoint

## After Fixing

Once `VITE_API_URL` is set correctly:
1. Frontend will call the real backend API
2. You'll see real brief items (or empty state if no items)
3. No more dummy/placeholder data

---

**The fallback was there for development, but it's confusing in production. Now it shows clear errors instead.**

