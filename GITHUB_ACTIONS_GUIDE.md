# 🤖 GitHub Actions Configuration Guide

## Overview

Your movie tracker runs automatically via GitHub Actions on a daily schedule. The workflow has been **updated** to support all the new v2.0 features!

## 📋 What Changed in the Workflow

### Updated `.github/workflows/fetch-titles.yaml`

#### Key Changes:

1. **Node.js Version**: Updated from 14 → 18
   - Better compatibility with modern packages
   - Improved Puppeteer support

2. **Checkout Action**: Updated from v2 → v4
   - Latest version with better performance

3. **Setup Node Action**: Updated from v2 → v4
   - More reliable dependency caching

4. **Git Auto-Commit**: Updated from v4 → v5
   - Better handling of multiple files

5. **New Step: Create .env file**
   - Sets configuration for the script
   - Enables all features (stats + HTML report)
   - Disables local backups (not needed in CI)

6. **Updated File Pattern**
   - Now commits: CSVs, STATS.md, and movie-dashboard.html
   - Better commit messages with emoji

## 🔍 What the Workflow Does Now

```yaml
Daily at midnight UTC:
  1. ✅ Checks out your repository
  2. ✅ Sets up Node.js 18
  3. ✅ Installs dependencies (including new ones: csvtojson, dotenv)
  4. ✅ Creates .env with configuration
  5. ✅ Runs npm start which:
     - Scrapes watched movies, wants, and shows
     - Preserves your notes/tags in CSVs
     - Updates CSV files
     - Generates STATS.md
     - Creates movie-dashboard.html
  6. ✅ Commits all changes (CSVs + reports)
  7. ✅ Pushes to GitHub
```

## 📊 What Gets Committed

Every day, the workflow will commit:
- ✅ `watched_titles.csv` - Updated with new movies
- ✅ `wants_titles.csv` - Updated watchlist
- ✅ `shows_titles.csv` - Updated TV shows
- ✅ `STATS.md` - Fresh statistics report
- ✅ `movie-dashboard.html` - Updated visual dashboard

**Your notes/tags are preserved!** The script merges new data with existing user data.

## ⚙️ Configuration via .env

The workflow creates this `.env` file:
```bash
MUST_USERNAME=subhransu
FETCH_WATCHED=true
FETCH_WANTS=true
FETCH_SHOWS=true
GENERATE_STATS=true
GENERATE_HTML_REPORT=true
CREATE_BACKUP=false  # Disabled in CI (no need for backups in git)
```

### Customization Options

If you want to change any settings, edit the workflow file:

```yaml
- name: Create .env file
  run: |
    echo "MUST_USERNAME=your_username" >> .env
    echo "FETCH_WATCHED=true" >> .env
    echo "FETCH_WANTS=true" >> .env
    echo "FETCH_SHOWS=true" >> .env
    echo "GENERATE_STATS=true" >> .env
    echo "GENERATE_HTML_REPORT=true" >> .env
    echo "CREATE_BACKUP=false" >> .env
```

### Available Options:

| Variable | Default | Description |
|----------|---------|-------------|
| `MUST_USERNAME` | `subhransu` | Your Must app username |
| `FETCH_WATCHED` | `true` | Fetch watched movies |
| `FETCH_WANTS` | `true` | Fetch watchlist |
| `FETCH_SHOWS` | `true` | Fetch TV shows |
| `GENERATE_STATS` | `true` | Generate STATS.md |
| `GENERATE_HTML_REPORT` | `true` | Generate dashboard |
| `CREATE_BACKUP` | `false` | Create local backups (disabled in CI) |
| `PAGE_TIMEOUT` | `180000` | Page load timeout (ms) |
| `NAVIGATION_TIMEOUT` | `180000` | Navigation timeout (ms) |

## 🎯 What You Need to Do

### Option 1: Merge the Feature Branch (Recommended)

The updated workflow is in `feature/enhanced-tracker`. To use it:

```bash
# Option A: Merge locally
git checkout main
git merge feature/enhanced-tracker
git push

# Option B: Push branch and create PR on GitHub
git checkout feature/enhanced-tracker
git push -u origin feature/enhanced-tracker
# Then create Pull Request on GitHub
```

### Option 2: Update Workflow File Only

If you want to update just the workflow file:

```bash
git checkout main
git checkout feature/enhanced-tracker -- .github/workflows/fetch-titles.yaml
git add .github/workflows/fetch-titles.yaml
git commit -m "Update GitHub Actions workflow for v2.0 features"
git push
```

## 🧪 Test the Workflow

You can manually trigger the workflow to test:

1. Go to GitHub → Your repository
2. Click **Actions** tab
3. Click **Fetch Movie Titles** workflow
4. Click **Run workflow** button
5. Watch it run!

Or trigger via command line:
```bash
# Requires GitHub CLI (gh)
gh workflow run "Fetch Movie Titles"
```

## 📅 Schedule

Current schedule: `0 0 * * *` (Daily at midnight UTC)

### Change Schedule (if needed):

```yaml
schedule:
  - cron: "0 0 * * *"    # Daily at midnight
  # - cron: "0 */12 * * *"  # Every 12 hours
  # - cron: "0 0 * * 0"     # Weekly on Sunday
  # - cron: "0 0 1 * *"     # Monthly on 1st
```

## 🔒 Permissions

The workflow has `contents: write` permission to:
- Commit changes to CSVs
- Commit generated reports
- Push to the repository

This is safe and required for the auto-commit functionality.

## 🐛 Troubleshooting

### If the workflow fails:

1. **Check Actions tab** on GitHub for error logs
2. **Common issues:**
   - Puppeteer browser launch failures
   - Network timeouts (increase timeouts in .env)
   - Must app HTML structure changed

### View Logs:
1. Go to GitHub → Actions
2. Click on the failed run
3. Click on "fetch-titles" job
4. Expand each step to see logs

### Manual Fix:
If it fails, you can always run locally:
```bash
npm start
git add .
git commit -m "Manual update"
git push
```

## 📊 View Generated Reports

After the workflow runs:

1. **STATS.md**: View directly on GitHub
   - Navigate to repository
   - Click `STATS.md`
   - See formatted statistics

2. **movie-dashboard.html**: View the dashboard
   - Go to repository
   - Click `movie-dashboard.html`
   - Click "Raw" or "Download"
   - Open in browser
   
   Or use GitHub Pages (see below)

## 🌐 Optional: Enable GitHub Pages

To view the HTML dashboard online:

1. Go to repository **Settings**
2. Scroll to **Pages** section
3. Source: Deploy from branch
4. Branch: `main`, folder: `/ (root)`
5. Save

Your dashboard will be available at:
`https://your-username.github.io/subh-movie-tracker/movie-dashboard.html`

## 📈 Git History = Tracking History

Every commit shows:
- What movies were added
- Rating changes
- Watchlist updates
- Statistics evolution

View history:
```bash
git log --oneline
git log -p watched_titles.csv  # See all changes to watched list
```

## 🎬 Benefits of the Updated Workflow

✅ **Automatic daily updates** - No manual work needed  
✅ **Complete tracking** - Movies + Stats + Dashboard  
✅ **Preserves your data** - Notes and tags maintained  
✅ **Git history** - See how your collection evolves  
✅ **Visual reports** - STATS.md and HTML dashboard  
✅ **Reliable** - Retry logic handles network issues  
✅ **Modern** - Uses latest GitHub Actions and Node.js  

## 📝 Summary

### Before (old workflow):
- ❌ Only updated CSVs
- ❌ No statistics generated
- ❌ No HTML dashboard
- ❌ Node.js 14 (older)
- ❌ Basic commit messages

### After (new workflow):
- ✅ Updates CSVs + Statistics + Dashboard
- ✅ Generates STATS.md automatically
- ✅ Creates movie-dashboard.html
- ✅ Node.js 18 (modern)
- ✅ Better commit messages with emojis
- ✅ Preserves user data (notes/tags)
- ✅ Configurable via .env

## 🚀 Ready to Deploy

Once you merge `feature/enhanced-tracker` to `main`, the updated workflow will:
1. Run on schedule
2. Use all new v2.0 features
3. Generate reports automatically
4. Commit everything to GitHub

**No additional action needed!** ✨

---

**Questions?** Check the README.md or GIT_RECOVERY_SUMMARY.md

