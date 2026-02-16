# Frontend Status - API Integration

## Current State

**The frontend is partially migrated to use the API, but still has fallback to placeholder data.**

### ✅ What's Working:
1. **API Client**: Created and imported (`src/services/api.ts`)
2. **Authentication**: Login/Register flow added
3. **Brief Loading**: Code tries to fetch from API first
4. **Fallback**: Falls back to `CONVO` if API fails (good for development)

### ⚠️ What Needs Configuration:

#### 1. API URL Environment Variable
The frontend needs to know where the backend is:

**For Local Development:**
- Default: `http://localhost:3001/api` (already set)
- This works if backend is running locally

**For Vercel Deployment:**
- You need to set `VITE_API_URL` in Vercel environment variables
- Value: `https://glean-morning-brief.onrender.com/api`
- This tells the frontend to call your Render backend

#### 2. Why It's Using Placeholder Data

The frontend will use placeholder data (`CONVO`) if:
- ❌ API URL is not set correctly
- ❌ Backend is not running/accessible
- ❌ API call fails (network error, auth error, etc.)
- ❌ Backend returns empty data

#### 3. How to Check

1. **Open browser console** (F12)
2. **Look for errors** when the app loads:
   - `Failed to load brief:` = API call failed
   - `Network Error` = Can't reach backend
   - `401 Unauthorized` = Not logged in

3. **Check Network tab**:
   - Look for requests to `/api/brief`
   - Check if they're going to the right URL
   - Check response status

## Next Steps

### For Local Testing:
1. Make sure backend is running: `cd backend && npm run dev`
2. Backend should be at `http://localhost:3001`
3. Frontend should automatically use `http://localhost:3001/api`

### For Vercel Deployment:
1. In Vercel dashboard → Your project → Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://glean-morning-brief.onrender.com/api`
3. Redeploy frontend

## Expected Behavior

**With API working:**
- ✅ Shows login screen first
- ✅ After login, fetches brief items from backend
- ✅ Displays real brief items in conversation
- ✅ Uses real AI conversation API

**With API failing (fallback):**
- ⚠️ Shows placeholder `CONVO` data
- ⚠️ Works but uses mock data
- ⚠️ Good for UI testing, not for real data

## Recommendation

**This is expected behavior for now!** The fallback ensures the app works even if:
- Backend isn't deployed yet
- API URL isn't configured
- You're just testing the UI

Once you:
1. ✅ Deploy backend to Render (DONE - `https://glean-morning-brief.onrender.com`)
2. ✅ Deploy frontend to Vercel
3. ✅ Set `VITE_API_URL` in Vercel
4. ✅ Test with real login

Then it will use real data instead of placeholders.

