# GitHub Setup - Push Your Code First

Before deploying to Render and Vercel, you need to push your code to GitHub.

## Step 1: Create GitHub Repository

1. **Go to GitHub:** https://github.com
2. **Sign in** (or create account)
3. **Click the "+" icon** (top right) → "New repository"
4. **Repository name:** `glean-morning-brief` (or any name)
5. **Visibility:** Public or Private (your choice)
6. **Don't initialize** with README, .gitignore, or license (we already have these)
7. **Click "Create repository"**

## Step 2: Initialize Git (if not already done)

Open terminal in your project folder and run:

```bash
# Check if git is already initialized
git status

# If you get an error, initialize git:
git init
```

## Step 3: Add All Files

```bash
# Add all files
git add .

# Check what will be committed
git status
```

## Step 4: Create .gitignore (if needed)

Make sure you have a `.gitignore` file that excludes sensitive files:

```gitignore
# Dependencies
node_modules/
backend/node_modules/

# Environment variables
.env
backend/.env
.env.local

# Build outputs
dist/
backend/dist/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Database
*.sqlite
*.db
```

## Step 5: Commit Your Code

```bash
# Commit all files
git commit -m "Initial commit - Glean Morning Brief app"
```

## Step 6: Connect to GitHub

```bash
# Add GitHub remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
```

**Get the URL from GitHub:**
- After creating the repo, GitHub shows you the commands
- Copy the URL from "push an existing repository" section

## Step 7: Push to GitHub

```bash
# Push to GitHub
git branch -M main
git push -u origin main
```

**If you get authentication errors:**
- Use GitHub Personal Access Token instead of password
- Or set up SSH keys
- See GitHub's authentication guide

## Step 8: Verify

1. Go to your GitHub repository page
2. You should see all your files there
3. Check that `backend/` folder is there
4. Check that frontend files are in root

## What Should Be in GitHub

Your repo should have:
- ✅ `backend/` folder (with all backend code)
- ✅ `src/` folder (frontend code)
- ✅ `package.json` (root)
- ✅ `vite.config.js`
- ✅ `vercel.json`
- ✅ `README.md`
- ✅ `.gitignore`
- ✅ All other project files

**Should NOT be in GitHub:**
- ❌ `.env` files
- ❌ `node_modules/`
- ❌ `dist/` folders

## After Pushing

Once your code is on GitHub:
1. ✅ You can connect Render to deploy backend
2. ✅ You can connect Vercel to deploy frontend
3. ✅ Both will automatically deploy when you push updates

## Quick Checklist

- [ ] GitHub account created/signed in
- [ ] New repository created on GitHub
- [ ] Git initialized in project folder
- [ ] `.gitignore` file created
- [ ] All files added (`git add .`)
- [ ] Files committed (`git commit`)
- [ ] GitHub remote added
- [ ] Code pushed to GitHub
- [ ] Verified files are on GitHub

## Troubleshooting

### "Repository not found"
- Check repository name is correct
- Check you have access (if private repo)
- Verify remote URL is correct

### Authentication errors
- Use Personal Access Token (Settings → Developer settings → Personal access tokens)
- Or set up SSH keys

### "Nothing to commit"
- Make sure you're in the right directory
- Check `.gitignore` isn't excluding everything
- Try `git add -f .env.example` to force add if needed

Once your code is on GitHub, you're ready to deploy! 🚀

