# Testing Checklist - What Should Work Now

## ✅ What's Been Fixed

1. ✅ Backend builds successfully on Render
2. ✅ Database migrations run automatically
3. ✅ Frontend builds successfully on Vercel
4. ✅ CORS configured for Vercel domains
5. ✅ API client connected
6. ✅ Error messages instead of dummy data

---

## 🧪 Step-by-Step Testing Guide

### Step 1: Verify Backend is Running

**Test the health endpoint:**
```bash
curl https://glean-morning-brief.onrender.com/health
```

**Expected:** 
```json
{"status":"ok","timestamp":"2024-..."}
```

**If it fails:**
- Backend might be sleeping (free tier) - wait ~30 seconds
- Check Render logs for errors
- Verify backend service is "Live" in Render dashboard

---

### Step 2: Test User Registration

**Register a new user:**
```bash
curl -X POST https://glean-morning-brief.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'
```

**Expected:**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  },
  "token": "eyJhbGc..."
}
```

**If it works:** ✅ Database migrations completed successfully!

**If it fails:**
- Check error message
- Verify `DATABASE_URL` is set in Render
- Check Render logs for migration errors

---

### Step 3: Test Frontend Connection

**Open your Vercel app in browser:**
- Go to: `https://your-vercel-app.vercel.app`

**What you should see:**

**Option A: If API is connected:**
- ✅ Login/Register screen
- OR if already logged in: Brief items (or empty state)

**Option B: If API connection fails:**
- ❌ Error message explaining what's wrong
- No dummy/placeholder data

**Check browser console (F12):**
- Look for API calls to `/api/brief` or `/api/auth/register`
- Check for CORS errors
- Check for network errors

---

### Step 4: Test Authentication Flow

**In your Vercel app:**

1. **Register a new user:**
   - Enter email: `test@example.com`
   - Enter name: `Test User`
   - Click "Register"

2. **Expected:**
   - ✅ Token saved to localStorage
   - ✅ Redirected to main app
   - ✅ Brief view loads

3. **If it fails:**
   - Check browser console for errors
   - Verify `VITE_API_URL` is set in Vercel
   - Check network tab for API calls

---

### Step 5: Test Brief Generation

**After logging in:**

1. **The app should:**
   - Try to fetch brief items from API
   - Show empty state if no items
   - OR show brief items if they exist

2. **To generate brief items:**
   - The backend has a brief generator
   - It needs integrations (Slack, GitHub, etc.) to create items
   - Without integrations, you'll see empty state

3. **Expected empty state message:**
   ```
   "Good morning! No urgent items right now. 
   Connect your integrations (Slack, GitHub, Jira, Calendar) 
   to see your brief items here."
   ```

---

### Step 6: Test API Endpoints (Optional)

**If you want to test individual endpoints:**

**1. Get brief items (requires auth token):**
```bash
curl -X GET https://glean-morning-brief.onrender.com/api/brief \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**2. Generate brief:**
```bash
curl -X POST https://glean-morning-brief.onrender.com/api/brief/generate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**3. Get memory:**
```bash
curl -X GET https://glean-morning-brief.onrender.com/api/memory \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ✅ Success Criteria

### Backend is working if:
- ✅ Health endpoint returns `{"status":"ok"}`
- ✅ User registration works
- ✅ Database migrations completed (check Render logs)
- ✅ No errors in Render logs

### Frontend is working if:
- ✅ Builds successfully on Vercel
- ✅ Shows login/register screen
- ✅ Can register/login
- ✅ Shows real data OR clear error messages (not dummy data)
- ✅ No CORS errors in browser console

### Integration is working if:
- ✅ Frontend can call backend API
- ✅ Authentication works
- ✅ Brief items load (or show empty state)
- ✅ No network errors in browser console

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot connect to backend API"
**Fix:**
1. Set `VITE_API_URL` in Vercel = `https://glean-morning-brief.onrender.com/api`
2. Set `FRONTEND_URL` in Render = your Vercel URL
3. Redeploy both services

### Issue: "401 Unauthorized"
**Fix:**
- Register/login first to get a token
- Token should be saved automatically

### Issue: "Backend not responding"
**Fix:**
- Check Render dashboard - service might be sleeping
- Free tier spins down after inactivity
- First request takes ~30 seconds

### Issue: "CORS error"
**Fix:**
- Verify `FRONTEND_URL` in Render matches your Vercel domain exactly
- Redeploy backend after setting environment variable

---

## 📋 Quick Test Checklist

- [ ] Backend health endpoint works
- [ ] User registration works
- [ ] Frontend loads without errors
- [ ] Can register/login in frontend
- [ ] Brief view loads (empty state is OK)
- [ ] No dummy/placeholder data
- [ ] No CORS errors in browser console
- [ ] API calls visible in browser network tab

---

## 🎯 What to Test Right Now

**Start with these 3 things:**

1. **Backend health check:**
   ```bash
   curl https://glean-morning-brief.onrender.com/health
   ```

2. **User registration:**
   ```bash
   curl -X POST https://glean-morning-brief.onrender.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "name": "Test User"}'
   ```

3. **Open Vercel app:**
   - Go to your Vercel URL
   - Check browser console (F12)
   - Try to register/login

**If all 3 work, everything is connected!** 🎉

---

## 📝 Next Steps After Testing

Once basic functionality works:

1. **Connect integrations** (Slack, GitHub, etc.) to see real brief items
2. **Test AI conversation** - talk to the agent
3. **Test memory system** - edit memory values
4. **Test scratchpad** - add notes

But for now, focus on getting the basic connection working!

