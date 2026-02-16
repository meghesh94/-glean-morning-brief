# Running Database Migrations on Render (Free Tier)

Since Render's free tier doesn't have a shell, here are **3 ways** to run migrations:

## ✅ Option 1: Automatic Migrations (RECOMMENDED)

**The backend now runs migrations automatically on startup!**

The server checks if tables exist, and if not, it runs the migration automatically. This means:
- ✅ Migrations run on first deploy
- ✅ Safe to run multiple times (uses `CREATE TABLE IF NOT EXISTS`)
- ✅ No manual steps needed

**Just deploy and it works!**

---

## Option 2: HTTP Endpoint (Backup Method)

If automatic migration doesn't work, you can trigger it via HTTP:

1. **Get your Render backend URL** (e.g., `https://glean-morning-brief.onrender.com`)

2. **Call the migration endpoint:**
   ```bash
   curl -X POST https://glean-morning-brief.onrender.com/api/migrate
   ```

   Or use any HTTP client:
   - Postman
   - Browser (if you add GET support)
   - Online tools like https://reqbin.com

3. **Check response:**
   - Success: `{"success": true, "message": "Migration completed"}`
   - Error: `{"success": false, "error": "..."}`

---

## Option 3: Run Locally (Pointing to Render Database)

You can run migrations from your local machine pointing to Render's database:

1. **Get your Render database URL:**
   - Go to Render dashboard → Your PostgreSQL service
   - Copy the "Internal Database URL" (or "External Connection String" if available)

2. **Set environment variable locally:**
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/dbname"
   ```

3. **Run migration:**
   ```bash
   cd backend
   npm run migrate
   ```

   Or directly:
   ```bash
   cd backend
   npx tsx src/db/migrate.ts
   ```

**Note:** This only works if Render allows external connections. Free tier might restrict this.

---

## How to Check if Migrations Ran

### Method 1: Check Server Logs
1. Go to Render dashboard → Your backend service
2. Click "Logs" tab
3. Look for:
   - ✅ `Database migration completed successfully` = Migration ran
   - ✅ `Database tables already exist, skipping migration` = Already migrated
   - ❌ `Migration failed:` = Error occurred

### Method 2: Test the API
Try registering a user:
```bash
curl -X POST https://glean-morning-brief.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'
```

If it works, migrations ran successfully!

### Method 3: Check Database (if you have access)
Connect to your Render database and check:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see:
- `users`
- `integrations`
- `brief_items`
- `memory`
- `scratchpad`
- `conversations`
- `actions`

---

## Troubleshooting

### "Migration failed" in logs
- Check if `DATABASE_URL` is set correctly in Render environment variables
- Check if database service is running
- Check database connection string format

### Tables don't exist after deploy
1. Check server logs for migration errors
2. Try Option 2 (HTTP endpoint) to manually trigger
3. Try Option 3 (run locally) if external connections are allowed

### "Table already exists" errors
- This is OK! The migration uses `CREATE TABLE IF NOT EXISTS`
- It means tables were already created
- Server will skip migration automatically

---

## Recommended Approach

**Just deploy!** The automatic migration (Option 1) should handle everything.

If you see errors:
1. Check Render logs
2. Try the HTTP endpoint (Option 2)
3. If still failing, try local migration (Option 3)

