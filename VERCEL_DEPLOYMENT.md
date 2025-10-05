# 🚀 Vercel Deployment Guide

## Deploy Movie Tracker Dashboard to Vercel

Your dashboard will be live at: **https://subh-movie-tracker.vercel.app/**

---

## ✨ What You Get

- **Live URL**: `https://subh-movie-tracker.vercel.app/`
- **Auto-redirect**: Landing page → Dashboard (3 seconds)
- **Direct access**: `https://subh-movie-tracker.vercel.app/movie-dashboard.html`
- **Stats page**: `https://subh-movie-tracker.vercel.app/STATS.md`
- **GitHub Integration**: Auto-deploys when you push to GitHub
- **Free hosting**: Vercel's free tier is perfect for this

---

## 📋 Setup Steps

### Option 1: Deploy via Vercel Web (Easiest) ⭐

1. **Go to Vercel**: https://vercel.com/

2. **Import GitHub Repository**:
   - Click "Add New Project"
   - Import `subhnet/subh-movie-tracker`
   - Or connect via: https://vercel.com/new

3. **Configure Project**:
   - Project Name: `subh-movie-tracker`
   - Framework Preset: **Other** (it's just static files)
   - Root Directory: `./` (keep default)
   - Build Command: Leave empty (no build needed)
   - Output Directory: Leave empty

4. **Deploy**:
   - Click "Deploy"
   - Wait 30-60 seconds
   - Done! ✨

5. **Your site is live at**:
   ```
   https://subh-movie-tracker.vercel.app/
   ```

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
cd /path/to/subh-movie-tracker
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - What's your project's name? subh-movie-tracker
# - In which directory is your code located? ./
# - Want to override settings? No

# Deploy to production
vercel --prod
```

---

## 🔄 How It Works

### File Structure
```
subh-movie-tracker/
├── index.html                    # Landing page (auto-redirects)
├── movie-dashboard.html          # Main dashboard
├── STATS.md                      # Statistics report
├── watched_titles.csv            # Data files
├── wants_titles.csv
├── shows_titles.csv
├── vercel.json                   # Vercel configuration
└── .github/workflows/
    └── fetch-titles.yaml         # GitHub Actions (updates data)
```

### Deployment Flow
```
GitHub Actions (daily):
  ↓ Runs script
  ↓ Updates CSVs + STATS.md + movie-dashboard.html
  ↓ Commits to GitHub
  ↓
Vercel (automatically):
  ↓ Detects GitHub push
  ↓ Deploys new version
  ↓ Site updated! ✨
```

### URL Routing

| URL | Shows |
|-----|-------|
| `https://subh-movie-tracker.vercel.app/` | Landing page (redirects to dashboard) |
| `https://subh-movie-tracker.vercel.app/movie-dashboard.html` | Main dashboard |
| `https://subh-movie-tracker.vercel.app/dashboard` | Also dashboard (via vercel.json) |
| `https://subh-movie-tracker.vercel.app/STATS.md` | Statistics report |

---

## ⚙️ Configuration (`vercel.json`)

The `vercel.json` file configures:

```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" },
    { "source": "/dashboard", "destination": "/movie-dashboard.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

**What this does:**
- ✅ Routes `/` to `index.html` (landing page)
- ✅ Routes `/dashboard` to `movie-dashboard.html` (cleaner URL)
- ✅ Disables caching so updates show immediately

---

## 🔄 Automatic Updates

### How Updates Work:

1. **Daily at midnight**: GitHub Actions runs
2. **Scrapes data**: Updates CSVs and generates reports
3. **Commits to GitHub**: New files pushed
4. **Vercel auto-deploys**: Site updates automatically

### Result:
Your Vercel site will **automatically update daily** with fresh data! 🎉

---

## 🎨 Landing Page Behavior

When someone visits `https://subh-movie-tracker.vercel.app/`:

1. **Landing page shows** (3 seconds):
   - Project overview
   - Key statistics
   - "View Dashboard" button

2. **Auto-redirects** to dashboard after 3 seconds
   - Or click button to go immediately

3. **Dashboard loads** with all your movie data

### Change Redirect Time

Edit `index.html`:
```javascript
// Change 3000 to desired milliseconds
setTimeout(function() {
    window.location.href = '/movie-dashboard.html';
}, 3000); // 3 seconds
```

Or disable auto-redirect (keep landing page):
```javascript
// Comment out or remove the setTimeout
```

---

## 🌐 Custom Domain (Optional)

Want a custom domain like `movies.subhnet.com`?

1. **In Vercel Dashboard**:
   - Go to Project Settings
   - Click "Domains"
   - Add your domain

2. **In Your DNS Provider**:
   - Add CNAME record: `movies` → `cname.vercel-dns.com`

3. **Wait for DNS**: 5-60 minutes

4. **Done**: `https://movies.subhnet.com/` works!

---

## 📊 Add to Your Portfolio

Once deployed, add to https://subhnet.vercel.app/:

```javascript
{
  title: "🎬 Movie Tracker Dashboard",
  description: "Automated movie tracking with 579+ movies, daily updates, and analytics",
  liveUrl: "https://subh-movie-tracker.vercel.app/",
  githubUrl: "https://github.com/subhnet/subh-movie-tracker",
  tags: ["Node.js", "Puppeteer", "GitHub Actions", "Vercel", "Automation"],
  features: [
    "579+ movies tracked",
    "Daily automated updates",
    "Beautiful visualizations",
    "7.04/10 average rating"
  ]
}
```

---

## 🔍 Environment Variables (If Needed)

Vercel deployments don't need environment variables for this project because:
- ✅ It's just static files (HTML, CSS, JS)
- ✅ No server-side code runs on Vercel
- ✅ Data updates happen via GitHub Actions

If you later add API routes:
1. Go to Project Settings → Environment Variables
2. Add variables
3. Redeploy

---

## 🐛 Troubleshooting

### Dashboard shows old data?
- Check if GitHub Actions ran successfully
- Look at recent commits on GitHub
- Vercel deploys when GitHub updates
- May take 1-2 minutes to deploy

### Redirect not working?
- Check browser console for errors
- Verify `index.html` has redirect script
- Test direct URL: `/movie-dashboard.html`

### 404 errors?
- Make sure files are committed to GitHub
- Check file names match exactly
- Verify `vercel.json` is in root directory

### Deployment failed?
- Check Vercel deployment logs
- Verify all files are committed
- Try redeploying manually

---

## 📱 Mobile Testing

Test on mobile before sharing:
1. Open `https://subh-movie-tracker.vercel.app/` on phone
2. Check dashboard loads correctly
3. Verify charts are responsive
4. Test all links work

---

## 🚀 Deployment Checklist

Before deploying:
- [x] `vercel.json` created
- [x] `index.html` has redirect (or landing page)
- [x] `movie-dashboard.html` exists
- [x] GitHub Actions workflow updated
- [ ] Merge `feature/enhanced-tracker` to `main`
- [ ] Push to GitHub
- [ ] Connect repo to Vercel
- [ ] Deploy
- [ ] Test live site
- [ ] Add to portfolio

---

## 🎯 Production URLs

After deployment, you'll have:

```
Main Site:
https://subh-movie-tracker.vercel.app/

Dashboard:
https://subh-movie-tracker.vercel.app/movie-dashboard.html
https://subh-movie-tracker.vercel.app/dashboard (alias)

Stats:
https://subh-movie-tracker.vercel.app/STATS.md

GitHub:
https://github.com/subhnet/subh-movie-tracker
```

---

## 🔄 Update Workflow

### To Update the Site:

**Automatic** (preferred):
1. GitHub Actions runs daily
2. Updates data files
3. Commits to GitHub
4. Vercel auto-deploys
5. ✨ Site updated!

**Manual**:
1. Run `npm start` locally
2. Commit changes
3. Push to GitHub
4. Vercel auto-deploys

---

## 💡 Pro Tips

1. **Instant updates**: Edit HTML/CSS on GitHub web editor → auto-deploys
2. **Preview deployments**: Every branch/PR gets preview URL
3. **Rollbacks**: Easy rollback to previous deployments in Vercel dashboard
4. **Analytics**: Enable Vercel Analytics for visitor stats
5. **Performance**: Vercel's CDN makes it super fast worldwide

---

## 🎬 Benefits vs GitHub Pages

| Feature | Vercel | GitHub Pages |
|---------|--------|--------------|
| Auto-deploy | ✅ Yes | ✅ Yes |
| Custom domains | ✅ Free | ✅ Free |
| HTTPS | ✅ Auto | ✅ Auto |
| Build time | ⚡ Faster | ✅ Good |
| Preview deployments | ✅ Yes | ❌ No |
| Analytics | ✅ Optional | ❌ No |
| Redirects | ✅ Easy | ⚠️ Tricky |
| API routes | ✅ Possible | ❌ No |

**Recommendation**: Vercel is better for this project! 🚀

---

## 🎉 You're Ready!

Deploy now:
1. Merge feature branch to main
2. Push to GitHub
3. Connect to Vercel
4. Deploy

Your dashboard will be live in 60 seconds! 🚀

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Guide](https://vercel.com/docs/cli)
- [Custom Domains](https://vercel.com/docs/concepts/projects/custom-domains)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

