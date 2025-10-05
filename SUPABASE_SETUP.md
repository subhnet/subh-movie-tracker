# 🗄️ Supabase Database Setup Guide

This guide will help you set up the FREE Supabase database for multi-user support.

## 📋 Prerequisites

- A GitHub account (you already have this)
- 5 minutes of your time

## 🚀 Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign in with GitHub (easiest option)
4. ✅ It's **FREE** - no credit card required!

## 🏗️ Step 2: Create a New Project

1. Click **"New Project"**
2. Fill in:
   - **Name**: `movie-tracker` (or any name you like)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you (e.g., US East, EU West)
   - **Pricing Plan**: Select **FREE** (stays free forever)
3. Click **"Create new project"**
4. ⏰ Wait 2-3 minutes for setup to complete

## 🔑 Step 3: Get Your API Keys

1. In your Supabase project dashboard, click **"Settings"** (⚙️ icon in sidebar)
2. Click **"API"** in the Settings menu
3. You'll see two keys:
   - **Project URL** (starts with `https://`)
   - **anon/public key** (starts with `eyJ...`)
4. 📋 Copy both - you'll need them next!

## 📊 Step 4: Create Database Tables

1. In Supabase dashboard, click **"SQL Editor"** in sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql` from your project
4. Paste it into the SQL Editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. ✅ You should see "Success. No rows returned"

This creates:
- `users` table (for login)
- `movies` table (your watchlist)
- Row-level security (keeps data private)
- Indexes for fast queries

## 🔐 Step 5: Configure Environment Variables

### For Local Development:

Edit `.env.local` and add:

```env
# Existing OpenRouter key
OPENROUTER_API_KEY=your-key-here

# New Supabase keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### For Vercel Deployment:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your `subh-movie-tracker` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
     Value: (your Supabase project URL)
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     Value: (your Supabase anon key)
5. Select environments: ✅ Production ✅ Preview ✅ Development
6. Click **"Save"**

## 🧪 Step 6: Test It Out

### Local Testing:

1. Make sure your `.env.local` is updated
2. Restart your dev server:
   ```bash
   npm run dev
   ```
3. Visit http://localhost:3000/login
4. Try creating an account!

### Production Testing:

1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "feat: add database and authentication"
   git push origin main
   ```
2. Wait for Vercel to deploy (~2 minutes)
3. Visit your live site at `https://your-app.vercel.app/login`

## 🎯 How It Works Now

### Dual Mode Operation:

1. **Without Login (CSV Mode)**:
   - Click "Continue without login"
   - Uses your existing CSV files
   - Single user experience
   - ✅ Nothing breaks!

2. **With Login (Database Mode)**:
   - Create account / login
   - Data stored in Supabase
   - Multi-user support
   - Each user has their own movies

### Data Flow:

```
User logs in
    ↓
Data fetched from Supabase database
    ↓
User adds/updates movie
    ↓
Saved to Supabase (instant)
    ↓
Available on any device
```

## 📈 Checking Your Usage (Staying Free)

1. Go to Supabase dashboard
2. Click **"Settings"** → **"Billing"**
3. See your usage:
   - Database: ___ MB / 500 MB (free)
   - Storage: ___ MB / 1 GB (free)
   - Bandwidth: ___ GB / 5 GB (free)

**You'll stay free as long as you're under these limits!**

## 🛠️ Troubleshooting

### Error: "Failed to fetch movies"

**Solution**: Check that:
1. Environment variables are set correctly in Vercel
2. You've run the SQL schema in Supabase
3. Your Supabase project is active

### Error: "User not found" when logging in

**Solution**: 
1. Make sure you registered an account first
2. Check username spelling (case-sensitive)

### Error: "Database error"

**Solution**:
1. Verify your Supabase project is running (not paused)
2. Check the SQL schema was applied correctly
3. Look at Supabase logs: Dashboard → Logs → API Logs

## 📚 What You Can Do Now

1. ✅ **Create user accounts** (Register page)
2. ✅ **Login/logout** (Top right corner)
3. ✅ **Add movies to database** (Coming in next update)
4. ✅ **Each user has separate data**
5. ✅ **Access from any device** (cloud-based)

## 🎁 Free Tier Limits

```
✅ 500MB database storage
✅ 1GB file storage
✅ 50,000 monthly active users
✅ 2 million edge function invocations
✅ 5GB bandwidth

Perfect for personal use and small apps!
```

## 🔜 Next Steps

After setup, you can:
1. Start using the app with database
2. Invite friends (each gets their own account)
3. Migrate your CSV data to database (optional)
4. Build more features (ratings, reviews, etc.)

## 🆘 Need Help?

- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- Or just ask me! 😊

---

**Enjoy your new multi-user movie tracker!** 🎉

