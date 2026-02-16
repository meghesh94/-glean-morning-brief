# Fix: Cannot Connect to Backend API

## The Problem

The frontend can't connect to the backend because of CORS or configuration issues.

## Quick Fix Checklist

### 1. ✅ Set `VITE_API_URL` in Vercel
- Go to **Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
- Add: `VITE_API_URL` = `https://glean-morning-brief.onrender.com/api`
- **Redeploy** frontend after adding

### 2. ✅ Set `FRONTEND_URL` in Render
- Go to **Render Dashboard** → Your backend service → **Environment** tab
- Add: `FRONTEND_URL` = `https://your-vercel-app.vercel.app`
- Replace `your-vercel-app` with your actual Vercel domain
- **Redeploy** backend after adding

### 3. ✅ Verify Backend is Running
Test the backend health endpoint:
```bash
curl https://glean-morning-brief.onrender.com/health
```

Should return: `{"status":"ok","timestamp":"..."}`

If it's sleeping (free tier), wait ~30 seconds for first request.

### 4. ✅ Check Browser Console
Open your Vercel app and check browser console (F12):
- Look for CORS errors
- Look for network errors
- Check the actual API URL being called

## What I Fixed

I updated the CORS configuration to:
- ✅ Allow all Vercel domains (`*.vercel.app`)
- ✅ Allow localhost for development
- ✅ Use `FRONTEND_URL` from environment
- ✅ More flexible origin checking

## After Setting Environment Variables

1. **Render:** Set `FRONTEND_URL` = your Vercel URL
2. **Vercel:** Set `VITE_API_URL` = `https://glean-morning-brief.onrender.com/api`
3. **Redeploy both** services
4. **Test again**

## Still Not Working?

### Check Backend Logs
1. Go to Render dashboard → Your backend → **Logs**
2. Look for CORS errors or connection issues
3. Check if migrations completed successfully

### Test Backend Directly
```bash
# Test health endpoint
curl https://glean-morning-brief.onrender.com/health

# Test API endpoint (should return 401 without auth)
curl https://glean-morning-brief.onrender.com/api/brief
```

### Common Issues

1. **Backend sleeping (free tier):**
   - First request takes ~30 seconds
   - Keep it awake with a ping service or upgrade to paid

2. **Wrong URLs:**
   - Make sure no trailing slashes
   - `VITE_API_URL` should end with `/api`
   - `FRONTEND_URL` should be your Vercel domain (no `/api`)

3. **CORS still blocking:**
   - Check browser console for specific CORS error
   - Verify `FRONTEND_URL` matches your Vercel domain exactly

## Next Steps

After fixing the environment variables and redeploying, the frontend should connect to the backend and show real data (or empty state if no items yet).

