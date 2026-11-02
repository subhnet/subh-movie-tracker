# 🎬 Subh's Movie Tracker

A personal movie tracking system. [Trakt](https://trakt.tv) is the source of truth; a daily GitHub Action backs your Trakt profile up into git-friendly CSV files, a full JSON dump and a statistics report, so the git history is a complete record of what you watched and when.

> Must app was the source until 2026-11; see the git history before that for the old scraper.

## ✨ Features

- **Daily Trakt backup** via GitHub Actions: watched movies, watchlist, shows, ratings and per-play watch dates
- **Three CSV lists**: Watched movies, Want-to-watch, and TV Shows
- **Full JSON dump** (`docs/trakt-backup.json`): every play, episode and rating with dates, which the CSVs can't hold
- **Statistics**: `docs/STATS.md` with totals, rating distributions, top-rated titles and watching patterns
- **Git-friendly**: stable ordering and no restamped dates, so each daily commit only shows real changes
- **Safety check**: the job refuses to overwrite the backup if Trakt returns far fewer rows than before

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A Trakt API client id ([create an app](https://trakt.tv/oauth/applications))
- A **public** Trakt profile (the backup uses Trakt's public endpoints, so no login or tokens are needed)

### Install

```bash
git clone <your-repo-url>
cd subh-movie-tracker
npm install
cp .env.example .env   # then set TRAKT_CLIENT_ID and TRAKT_USERNAME
```

### Back up now

```bash
npm run backup   # reads TRAKT_CLIENT_ID / TRAKT_USERNAME from .env
```

This will:
1. Fetch your watched, history, ratings and watchlist for movies and shows from Trakt
2. Rewrite `public/watched_titles.csv`, `wants_titles.csv` and `shows_titles.csv` (keeping your notes/tags)
3. Write `docs/trakt-backup.json`
4. Regenerate `docs/STATS.md`

If anything fails nothing is written and the command exits non-zero. Use `FORCE=true npm run backup` to skip the row-count safety check when a big drop is intentional.

#### Generate statistics only
```bash
npm run stats
```

#### Run the tests
```bash
npm run test:backup
```

### Using Docker

```bash
docker-compose up -d            # the web app on http://localhost:3000
docker-compose exec app npm run backup
```

## 📁 Files Structure

```
subh-movie-tracker/
├── package.json              # Dependencies and scripts
├── .env                      # Configuration (not in git)
├── .env.example             # Configuration template
├── backups/                 # Optional local snapshots (not in git)
├── public/                  # The 3 canonical CSVs + Next.js static assets
│   ├── watched_titles.csv   # Movies you've watched
│   ├── wants_titles.csv     # Movies you want to watch
│   └── shows_titles.csv     # TV shows you're tracking
├── docs/                    # Documentation, generated reports & archive
│   ├── STATS.md             # Generated statistics report
│   ├── trakt-backup.json    # Full Trakt dump (plays, episodes, ratings, watchlists)
│   ├── supabase-schema.sql  # Supabase table definitions
│   ├── migrations/          # One-off SQL migrations applied to Supabase
│   └── archive/             # Old/dead generated artifacts
└── scraper/                  # Backup pipeline (never imported by the Next.js app)
    ├── trakt-backup.js       # Trakt → CSVs + JSON dump + stats
    ├── trakt-backup.test.js  # Unit tests (node --test)
    ├── analytics.js          # docs/STATS.md generation
    └── backfill-posters.js   # Manual Supabase poster backfill (not part of the daily job)
```

## 📊 CSV Schema

Each CSV file has the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `title` | Movie/show title | "Inception" |
| `rating` | Your rating (1-10 or N/A) | "9" |
| `watchedDate` | When you watched it (YYYY-MM-DD) | "2025-01-15" |
| `notes` | Your personal notes | "Amazing plot twists!" |
| `tags` | Semicolon-separated tags | "favorite;mind-bending" |
| `rewatched` | Played more than once on Trakt | "true" or "false" |
| `year` | Release year (disambiguates remakes) | "2021" |
| `imdb` | IMDb id | "tt1375666" |

### Editing CSV Files

You can manually edit CSV files to:
- Add notes and reviews
- Add custom tags

**Important**: `notes` and `tags` only exist in the CSVs (Trakt has no equivalent), and the backup preserves them when it rewrites the files. Everything else (title, rating, dates, rewatched) is overwritten from Trakt, so change those on Trakt, not in the CSV.

## ⚙️ Configuration

Environment variables for `npm run backup` (in `.env`, or repository secrets/workflow env in GitHub):

| Variable | Default | Purpose |
|---|---|---|
| `TRAKT_CLIENT_ID` | required | Trakt API client id |
| `TRAKT_USERNAME` | `subhnet` | Public Trakt profile to back up |
| `TRAKT_TIMEZONE` | `Asia/Kolkata` | Timezone used to turn watch times into dates |
| `FORCE` | unset | `true` skips the "row count dropped" safety check |

## 🎨 Customization Ideas

### Add Custom Tags

Edit your CSV files and add tags:
```csv
title,rating,watchedDate,notes,tags,rewatched
Inception,9,2025-01-15,Mind-blowing,favorite;sci-fi;mind-bending,false
```

### Track Watch Dates

Set the `watchedDate` column to see patterns in `docs/STATS.md`:
```csv
title,rating,watchedDate,...
Movie 1,8,2025-01-15,...
Movie 2,9,2025-01-20,...
```

### Add Personal Notes

Use the `notes` column for reviews:
```csv
title,rating,...,notes,...
Interstellar,10,...,Best movie ever! The soundtrack is incredible,...
```

## 🔄 Automation with GitHub Actions

`.github/workflows/trakt-backup.yaml` runs daily at 00:00 UTC (and on demand from the Actions tab):
1. Fetches your Trakt data
2. Rewrites the CSVs, `docs/trakt-backup.json` and `docs/STATS.md`
3. Commits any changes back to the repo, so git history = complete tracking history

One-time setup: add a repository secret **`TRAKT_CLIENT_ID`** (Settings → Secrets and variables → Actions). The username is set in the workflow (`TRAKT_USERNAME`). Keep your Trakt profile public or the job will fail with a clear error.

## 📈 Statistics Examples

The `docs/STATS.md` file includes:

- **Watched Movies Stats**
  - Total watched, rated, unrated
  - Average rating
  - Rating distribution with bars
  - Top 10 rated movies (8+)
  - Watching patterns (by month/year)

- **Want to Watch Stats**
  - Total on watchlist
  - Completion rate
  - Recently added items

- **TV Shows Stats**
  - Total shows tracked
  - Top-rated shows

- **Tag Analysis**
  - Most used tags across all content

## 🎯 Best Practices

1. **Let the Action run daily**: the git history is the record
2. **Edit on Trakt**: ratings, dates and watchlist changes belong on Trakt; only notes/tags are edited in the CSVs
3. **Backup Folder**: Keep `backups/` in `.gitignore` (local only)
4. **Add Metadata**: Regularly add notes and tags to your CSVs
5. **Review Stats**: Check `docs/STATS.md` to discover patterns

## 🐛 Troubleshooting

### Backup fails with HTTP 401/403/404
- Check `TRAKT_CLIENT_ID` (a repository secret in GitHub)
- Make sure the Trakt profile is public (Trakt → Settings → Privacy)

### "Refusing to overwrite the backup, row counts dropped"
- Trakt returned much less than the committed CSVs, usually a partial API response. Re-run later, or `FORCE=true` if the drop is real

### Missing Dependencies
```bash
npm install
```

## 🎬 Coming Soon

Potential future enhancements:
- CLI interface for searching and filtering
- External API integration (OMDb/TMDb) for metadata
- Watch time tracking and estimates
- Recommendation engine based on ratings
- Export to other formats (JSON, Markdown lists)
- Integration with Letterboxd/IMDb

## 📝 License

ISC

## 👤 Author

Subhransu

---

**Happy Tracking! 🍿**

*Backed up daily from Trakt by GitHub Actions*
