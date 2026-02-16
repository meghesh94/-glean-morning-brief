# PostgreSQL Setup Guide

## Step 1: Install PostgreSQL

### Windows

1. **Download PostgreSQL:**
   - Go to https://www.postgresql.org/download/windows/
   - Download the installer from EnterpriseDB
   - Or use the direct link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. **Run the installer:**
   - Follow the installation wizard
   - **Remember the password you set for the `postgres` user** - you'll need it!
   - Default port is 5432 (keep this)
   - Install all components (including pgAdmin if you want a GUI)

3. **Verify installation:**
   - Open Command Prompt or PowerShell
   - Run: `psql --version`
   - Should show the version number

### Mac

```bash
# Using Homebrew
brew install postgresql@14
brew services start postgresql@14
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Step 2: Create the Database

### Option A: Using Command Line (Recommended)

1. **Open a terminal/command prompt**

2. **Connect to PostgreSQL:**
   ```bash
   psql -U postgres
   ```
   (Enter the password you set during installation)

3. **Create the database:**
   ```sql
   CREATE DATABASE glean_brief;
   ```

4. **Verify it was created:**
   ```sql
   \l
   ```
   (You should see `glean_brief` in the list)

5. **Exit psql:**
   ```sql
   \q
   ```

### Option B: Using pgAdmin (GUI - Windows/Mac)

1. Open **pgAdmin** (installed with PostgreSQL)
2. Connect to your PostgreSQL server (use the password you set)
3. Right-click on "Databases" → "Create" → "Database"
4. Name it: `glean_brief`
5. Click "Save"

## Step 3: Update Your .env File

In your `backend/.env` file, update the DATABASE_URL:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/glean_brief
```

Replace `YOUR_PASSWORD` with the password you set for the `postgres` user during installation.

**Example:**
```env
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/glean_brief
```

## Step 4: Test the Connection

After setting up the database and updating `.env`, you can test it by running the migration:

```bash
cd backend
npm run migrate
```

If it works, you'll see: "Database migration completed successfully"

## Troubleshooting

### "psql: command not found"
- **Windows:** Add PostgreSQL's `bin` folder to your PATH
  - Usually: `C:\Program Files\PostgreSQL\14\bin` (version may vary)
  - Or use the full path: `"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres`

### "Password authentication failed"
- Make sure you're using the correct password you set during installation
- Try resetting the password in pgAdmin if needed

### "Database already exists"
- That's fine! The migration will work with an existing database
- Or drop it and recreate: `DROP DATABASE glean_brief;` then `CREATE DATABASE glean_brief;`

### Connection refused / Can't connect
- Make sure PostgreSQL service is running
- **Windows:** Check Services (services.msc) - look for "postgresql" service
- **Mac/Linux:** `sudo systemctl status postgresql` or `brew services list`

## Quick Test

Once everything is set up, test with:

```bash
cd backend
npm run migrate
```

If successful, you're ready to go! 🎉

