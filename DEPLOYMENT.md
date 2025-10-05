# 🚀 Deploying Movie Tracker to Vercel

## Prerequisites

1. ✅ Git repository (you have this)
2. ✅ GitHub account
3. ✅ Vercel account (free - sign up at https://vercel.com)

## Step-by-Step Deployment Guide

### Step 1: Commit Your Changes

Your current changes are not committed yet. Let's commit them:

```bash
# Add all the updated files
git add app/ OPENROUTER_SETUP.md

# Commit with a descriptive message
git commit -m "feat: Enhanced UI and OpenRouter AI recommendations

- Improved dashboard look and feel with translucent cards
- Integrated OpenRouter for AI-powered movie recommendations
- Added rating-based recommendation system with genre analysis
- Filter to exclude already-watched movies
- Better navigation and consistent design system"

# Push to GitHub
git push origin feature/enhanced-tracker
```

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy**:
```bash
# From your project root
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (choose your account)
# - Link to existing project? No
# - Project name? movie-tracker (or your choice)
# - Directory? ./ (just press Enter)
# - Override settings? No
```

4. **Set Environment Variables**:
```bash
# Add your OpenRouter API key
vercel env add OPENROUTER_API_KEY

# When prompted, paste: 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
# Select: Production, Preview, Development (all three)

# Add app name
vercel env add OPENROUTER_APP_NAME

# When prompted, type: Movie Tracker
# Select: Production, Preview, Development

# Add app URL (you'll update this after first deploy)
vercel env add OPENROUTER_APP_URL

# When prompted, type: https://your-project.vercel.app
# Select: Production, Preview, Development
```

5. **Deploy to Production**:
```bash
vercel --prod
```

#### Option B: Deploy via Vercel Dashboard (Easier for First Time)

1. **Go to Vercel Dashboard**: https://vercel.com/new

2. **Import Git Repository**:
   - Click "Add New..." → "Project"
   - Click "Import" next to your GitHub repository
   - If you don't see it, click "Import Git Repository" and paste the URL

3. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)

4. **Add Environment Variables**:
   Click "Environment Variables" and add:
   
   | Name | Value |
   |------|-------|
   | `OPENROUTER_API_KEY` | `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` |
   | `OPENROUTER_APP_NAME` | `Movie Tracker` |
   | `OPENROUTER_APP_URL` | `https://your-project.vercel.app` (update after first deploy) |

5. **Click Deploy**! 🚀

### Step 3: Update Environment Variables (After First Deploy)

Once deployed, update the `OPENROUTER_APP_URL`:

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Update `OPENROUTER_APP_URL` with your actual Vercel URL
4. Redeploy (or push a new commit)

### Step 4: Update GitHub Actions (Optional)

If you want to update your CSV files automatically, update `.github/workflows/fetch-titles.yaml` to trigger deployments on Vercel after updating CSVs.

## 📋 Post-Deployment Checklist

- [ ] Site is live and accessible
- [ ] Dashboard loads and shows your stats
- [ ] Charts are displaying correctly
- [ ] AI Recommendations page loads
- [ ] Can generate AI recommendations successfully
- [ ] Navigation between pages works
- [ ] Responsive design works on mobile
- [ ] Check Vercel logs for any errors

## 🔧 Troubleshooting

### Build Fails

**Error**: Module not found
- **Solution**: Make sure all dependencies are in `package.json`
- Run `npm install` locally to verify

### Environment Variables Not Working

**Error**: API key not configured
- **Solution**: Ensure environment variables are set in Vercel dashboard
- Redeploy after adding/updating variables

### AI Recommendations Not Working

**Error**: 401 or API errors
- **Solution**: Verify `OPENROUTER_API_KEY` is correct in Vercel
- Check OpenRouter dashboard for API usage/credits

### CSV Files Not Found

**Issue**: Dashboard shows no data
- **Solution**: Make sure CSV files are in the repository
- They should be at root level: `watched_titles.csv`, `shows_titles.csv`, `wants_titles.csv`

## 🔄 Continuous Deployment

Once set up, Vercel will automatically deploy:
- **Every push to `main` branch** → Production deployment
- **Every push to other branches** → Preview deployment
- **Every pull request** → Preview deployment with unique URL

## 📊 Monitoring

- **Analytics**: https://vercel.com/[your-username]/[project-name]/analytics
- **Logs**: https://vercel.com/[your-username]/[project-name]/logs
- **Deployments**: https://vercel.com/[your-username]/[project-name]/deployments

## 💰 Costs

Vercel Free Tier includes:
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ 100GB bandwidth/month
- ✅ Serverless functions (your API routes)
- ✅ Edge network (global CDN)

**This project fits perfectly in the free tier!**

## 🎯 Custom Domain (Optional)

To use a custom domain:

1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Vercel handles SSL automatically

## 📱 Share Your Dashboard

Once deployed, share your movie tracker at:
```
https://your-project.vercel.app
```

## 🆘 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **OpenRouter Docs**: https://openrouter.ai/docs

---

**Your app is production-ready!** 🎉

