# 🚀 Next.js Migration Plan

## Overview

Converting the movie tracker to Next.js while keeping the scraper functionality intact.

## Current Structure (Keep)
```
subh-movie-tracker/
├── movies.js              # Scraper (KEEP)
├── utils/                 # Scraper utilities (KEEP)
├── *.csv                  # Data files (KEEP)
├── .github/workflows/     # GitHub Actions (KEEP & UPDATE)
└── package.json           # Update with Next.js deps
```

## New Next.js Structure (Add)
```
subh-movie-tracker/
├── app/                   # Next.js App Router
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Dashboard (home)
│   ├── api/              # API Routes
│   │   ├── movies/route.ts
│   │   ├── stats/route.ts
│   │   └── recommend/route.ts  # AI recommendations
│   ├── recommendations/
│   │   └── page.tsx      # Recommendations page
│   └── components/       # React components
│       ├── StatCards.tsx
│       ├── RatingChart.tsx
│       └── TopRatedTable.tsx
├── lib/                   # Utilities
│   ├── csv-reader.ts     # Read CSVs
│   └── ai-recommender.ts # AI logic
├── public/               # Static assets
├── next.config.js        # Next.js config
└── tsconfig.json         # TypeScript config
```

## Migration Steps

### ✅ Phase 1: Setup (30 mins)
- [x] Create Next.js in separate folder (done)
- [ ] Copy scraper files to new structure
- [ ] Install additional dependencies
- [ ] Configure Next.js

### Phase 2: Port Dashboard (1 hour)
- [ ] Convert HTML to React components
- [ ] Port Chart.js to React Chart.js 2
- [ ] Create stat cards component
- [ ] Create tables component
- [ ] Style with Tailwind CSS

### Phase 3: API Routes (30 mins)
- [ ] Create /api/movies endpoint (read CSVs)
- [ ] Create /api/stats endpoint (analytics)
- [ ] Test data fetching

### Phase 4: AI Features (1 hour)
- [ ] Install AI SDK (OpenAI/Anthropic)
- [ ] Create recommendation algorithm
- [ ] Build UI for recommendations
- [ ] Add loading states

### Phase 5: Deploy (15 mins)
- [ ] Update vercel.json
- [ ] Test locally
- [ ] Deploy to Vercel
- [ ] Verify GitHub Actions still work

## Key Decisions

### Keep Scraper Separate
- movies.js stays as Node.js script
- GitHub Actions continues to work
- CSVs committed to repo
- Next.js reads CSVs at runtime

### Data Flow
```
GitHub Actions (daily)
    ↓
Run movies.js
    ↓
Update CSVs + commit
    ↓
Vercel detects push
    ↓
Redeploys Next.js app
    ↓
App reads latest CSVs
    ↓
Displays + AI recommendations
```

### AI Integration Options

**Option A: OpenAI GPT-4** (Recommended)
- Best for natural language
- Excellent recommendations
- $0.01-0.03 per request
- Easy to implement

**Option B: Claude (Anthropic)**
- Great analysis
- Similar pricing
- Alternative to OpenAI

**Option C: Local/Free (Future)**
- Use your rating patterns
- Algorithm-based
- No API costs
- Less sophisticated

## Features Roadmap

### MVP (Phase 1)
- ✅ Dashboard with current features
- ✅ Chart.js visualizations
- ✅ Responsive design
- ✅ Read from CSVs

### V2 (AI Features)
- 🎯 "Recommend what to watch next"
- 🎯 "Movies similar to [title]"
- 🎯 "Predict my rating for [movie]"
- 🎯 Smart watchlist sorting

### V3 (Advanced)
- Search & filters
- Multiple users (auth)
- Social features (share ratings)
- Genre deep dives
- Mood-based recommendations

## Tech Stack

### Frontend
- **Next.js 14** - Framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Chart.js** - Visualizations
- **react-chartjs-2** - React wrapper

### Backend (API Routes)
- **Next.js API Routes** - Serverless functions
- **OpenAI SDK** - AI recommendations
- **CSV Parser** - Read data files

### Deployment
- **Vercel** - Hosting (free tier)
- **GitHub Actions** - Scraper automation

## Environment Variables Needed

```env
# .env.local (not committed)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-... (optional)
MUST_USERNAME=subhransu
```

## Benefits

### What You Gain
✅ Professional React app
✅ AI-powered recommendations
✅ Interactive features
✅ Better mobile experience
✅ Portfolio-quality project
✅ Room for growth
✅ Modern tech stack

### What Stays Same
✅ Scraper works as-is
✅ GitHub Actions unchanged
✅ Data in CSVs (git-tracked)
✅ Daily automation
✅ Simple deployment

## Timeline

- **Today**: Basic Next.js setup + dashboard
- **Tomorrow**: AI recommendations working
- **This Week**: Polish + deploy
- **Ongoing**: Add features as you want

## Cost Estimate

- **Vercel**: Free
- **GitHub Actions**: Free
- **OpenAI API**: ~$1-5/month (personal use)
- **Total**: Under $5/month

## Next Steps

1. Install dependencies
2. Create basic dashboard
3. Port current visualizations
4. Add AI endpoint
5. Build recommendation UI
6. Deploy and test

Ready to start! 🚀

