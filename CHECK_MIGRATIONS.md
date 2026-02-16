# How to Check if Database Migrations Completed on Render

## Method 1: Check Render Logs (Easiest)

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Click on your backend service (e.g., `glean-brief-backend`)

2. **Click "Logs" tab**

3. **Look for these messages:**

   ✅ **Success:**
   ```
   Running database migrations...
   ✅ Database migration completed successfully
   ```

   ✅ **Already migrated:**
   ```
   Database tables already exist, skipping migration
   ```

   ❌ **Error:**
   ```
   ❌ Migration failed: [error message]
   ```

4. **If you don't see migration messages:**
   - Scroll up in the logs
   - Look for messages right after "Server running on port..."
   - Migrations run on server startup

---

## Method 2: Test the API (Best Verification)

Try to register a user - if migrations worked, this will succeed:

### Using curl:
```bash
curl -X POST https://glean-morning-brief.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'
```

### Using browser/Postman:
- URL: `POST https://glean-morning-brief.onrender.com/api/auth/register`
- Body (JSON):
  ```json
  {
    "email": "test@example.com",
    "name": "Test User"
  }
  ```

**Expected responses:**

✅ **Success (migrations worked):**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  },
  "token": "..."
}
```

❌ **Error (migrations failed):**
```json
{
  "error": "relation \"users\" does not exist"
}
```
or
```json
{
  "error": "Failed to create user"
}
```

---

## Method 3: Check Health Endpoint

```bash
curl https://glean-morning-brief.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

This confirms the server is running, but doesn't confirm migrations.

---

## Method 4: Manual Migration Endpoint

If you're not sure, trigger migration manually:

```bash
curl -X POST https://glean-morning-brief.onrender.com/api/migrate
```

**Expected responses:**

✅ **Success:**
```json
{
  "success": true,
  "message": "Migration completed"
}
```

✅ **Already migrated:**
```json
{
  "success": true,
  "message": "Migration completed"
}
```
(It's idempotent, so it's safe to run multiple times)

❌ **Error:**
```json
{
  "success": false,
  "error": "[error details]"
}
```

---

## Method 5: Check Database Directly (If You Have Access)

If Render gives you database access:

1. Connect to your PostgreSQL database
2. Run:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

3. **Should see these tables:**
   - `users`
   - `integrations`
   - `brief_items`
   - `memory`
   - `scratchpad`
   - `conversations`
   - `actions`

---

## Quick Checklist

- [ ] Check Render logs for migration messages
- [ ] Test `/api/auth/register` endpoint
- [ ] If unsure, call `/api/migrate` endpoint
- [ ] Verify tables exist (if you have DB access)

---

## Troubleshooting

### "Migration failed" in logs
- Check `DATABASE_URL` is set correctly in Render environment variables
- Check database service is running
- Check connection string format

### No migration messages in logs
- Server might have started before migrations
- Try calling `/api/migrate` manually
- Check if tables already exist (test with API)

### API returns "relation does not exist"
- Migrations didn't run
- Call `/api/migrate` endpoint manually
- Check Render logs for errors

---

## Recommended: Use Method 2 (Test API)

**The best way to verify:** Try registering a user. If it works, migrations completed successfully! 🎉

