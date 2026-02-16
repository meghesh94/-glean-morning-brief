# Quick Deployment Checklist

## ✅ Backend (Render) - DONE!
- **URL:** https://glean-morning-brief.onrender.com
- **Status:** Deployed ✅

## Next: Frontend (Vercel)

### Step 1: Deploy to Vercel
1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Vercel will auto-detect Vite

### Step 2: Add Environment Variable
In Vercel project settings → Environment Variables:

**Key:** `VITE_API_URL`  
**Value:** `https://glean-morning-brief.onrender.com/api`

### Step 3: Deploy
- Click "Deploy"
- Wait for build to complete
- You'll get a URL like: `https://your-app.vercel.app`

### Step 4: Update Backend CORS
Go back to Render → Your backend service → Environment tab:

**Update:**
```env
FRONTEND_URL=https://your-vercel-app.vercel.app
```
(Use your actual Vercel URL from Step 3)

### Step 5: Test
1. Visit your Vercel URL
2. Try registering/logging in
3. Check browser console for any errors

## Quick Test URLs

- **Backend Health:** https://glean-morning-brief.onrender.com/health
- **Frontend:** (Your Vercel URL after deployment)

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_URL` in Vercel matches: `https://glean-morning-brief.onrender.com/api`
- Verify backend is running (check health URL above)
- Check `FRONTEND_URL` in Render matches your Vercel URL

### CORS errors
- Make sure `FRONTEND_URL` in Render is set to your Vercel URL
- No trailing slash in URLs

You're almost there! Just deploy frontend to Vercel now! 🚀

