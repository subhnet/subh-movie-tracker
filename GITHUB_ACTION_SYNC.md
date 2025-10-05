# 🔄 Automatic Database Sync via GitHub Actions

Your GitHub Action now automatically syncs CSV data to Supabase database!

## ✨ What It Does

Every time the GitHub Action runs (daily or manually):
1. ✅ Fetches movie titles from Must.watch
2. ✅ Updates CSV files
3. ✅ **Syncs data to Supabase database**
4. ✅ Avoids duplicates
5. ✅ Updates changed ratings/tags
6. ✅ Commits changes to GitHub

## 🔧 Setup (One-Time)

### Step 1: Get Supabase Service Key

1. Go to your Supabase project dashboard
2. Click **Settings** (⚙️) → **API**
3. Find the **service_role key** (starts with `eyJ...`)
   - ⚠️ This is different from the `anon` key!
   - ⚠️ Never expose this key publicly!
4. Copy the service_role key

### Step 2: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these two secrets:

**Secret 1:**
- Name: `SUPABASE_URL`
- Value: `https://your-project.supabase.co` (same as before)

**Secret 2:**
- Name: `SUPABASE_SERVICE_KEY`
- Value: Your service_role key from Step 1

### Step 3: Run the Action

**Option A: Wait for Daily Run**
- Action runs automatically every day at midnight UTC

**Option B: Manual Run**
1. Go to GitHub → **Actions** tab
2. Select **"Fetch Movie Titles"** workflow
3. Click **"Run workflow"** → **"Run workflow"**
4. Watch it run!

## 📊 How It Works

### Duplicate Prevention

The script checks each movie by `title + type + user_id`:
- **New movie?** → Add to database
- **Exists, unchanged?** → Skip
- **Exists, rating/tags changed?** → Update

### Example Output

```
🔄 Starting CSV to Supabase sync...

Target user: subhransu
Supabase URL: https://xxx.supabase.co

✓ Found existing user: subhransu (uuid-here)

📂 Reading CSV files...
  ✓ Watched: 574 movies
  ✓ Wants: 186 movies
  ✓ Shows: 93 shows

💾 Syncing to database...
  Watched movies...
    Added: 574, Updated: 0, Skipped: 0
  Want to watch...
    Added: 186, Updated: 0, Skipped: 0
  TV Shows...
    Added: 93, Updated: 0, Skipped: 0

✅ Sync complete!
   Added: 853 new movies
   Updated: 0 existing movies
   Skipped: 0 unchanged movies
   Total in database: 853 movies
```

## 🧪 Test It Locally (Optional)

To test the sync script locally before the Action runs:

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"
export MUST_USERNAME="subhransu"

# Run the sync
node utils/sync-to-supabase.js
```

## 🔐 Security Notes

- ✅ Service key is stored as GitHub Secret (encrypted)
- ✅ Never committed to code
- ✅ Only GitHub Actions can access it
- ✅ Supabase RLS policies still apply

## 📝 What Gets Synced

For each movie, the script syncs:
- `title` - Movie/show name
- `rating` - Your rating (if any)
- `tags` - Tags/genres
- `type` - 'watched', 'want', or 'show'
- `user_id` - Your user ID (from username)

## 🔄 Update Frequency

- **Automatic**: Daily at midnight UTC
- **Manual**: Run anytime from GitHub Actions tab
- **On changes**: Runs when you push code changes

## ❓ Troubleshooting

### "Supabase not configured" message
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to GitHub Secrets

### "Failed to create user" error
- Check if service_role key is correct
- Verify Supabase project is active

### "Permission denied" error
- Make sure you're using service_role key, not anon key
- Check RLS policies allow inserts

### Movies not appearing in dashboard
- Make sure you're logged in with username "subhransu"
- Check GitHub Action ran successfully
- Verify sync step completed without errors

## 🎯 Benefits

✅ **Automatic** - No manual work needed
✅ **No Duplicates** - Smart upsert logic
✅ **Always in Sync** - Database matches CSV
✅ **Multi-Device** - Access from anywhere
✅ **Backup** - CSV files + Database
✅ **Version Control** - Git tracks all changes

## 🚀 Next Steps

After setup:
1. ✅ Action will sync your current 574 watched, 186 wants, 93 shows
2. ✅ Login to your account at https://your-app.vercel.app/login
3. ✅ See all your movies in the dashboard!
4. ✅ Get personalized AI recommendations

---

**Enjoy your auto-synced movie tracker!** 🎬

