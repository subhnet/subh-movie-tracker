# 🎬 Subh's Movie Tracker

A comprehensive personal movie tracking system that scrapes data from Must app, generates analytics, and creates beautiful visual reports. All data is stored in git-friendly CSV files for easy version control and historical tracking.

## ✨ Features

### 🎯 Core Features
- **Automatic Scraping**: Fetches movies, shows, and watchlist from Must app
- **Three Lists**: Watched movies, Want-to-watch, and TV Shows
- **Rating Tracking**: Captures your ratings for all content
- **Automatic Backups**: Creates timestamped backups before each update
- **Retry Logic**: Robust error handling with automatic retries
- **Git-Friendly**: All data in CSV format, perfect for version control

### 📊 Analytics & Reporting
- **Statistics Dashboard**: Comprehensive STATS.md with insights
  - Total counts and averages
  - Rating distributions with visual bars
  - Top-rated content (8+ stars)
  - Watching patterns by month/year
  - Completion rates
  - Tag analysis
- **HTML Dashboard**: Beautiful visual report (`index.html`)
  - Interactive charts
  - Rating distribution graphs
  - Top-rated tables
  - Responsive design

### 📝 Enhanced Data Tracking
- **Watch Dates**: Track when you watched each movie
- **Personal Notes**: Add reviews and comments
- **Custom Tags**: Categorize with tags (e.g., "favorite", "mind-bending")
- **Rewatch Tracking**: Mark movies you've watched multiple times
- **Scraped Dates**: Automatic timestamps for data tracking

### 🛠️ Technical Improvements
- **Environment Variables**: Configurable via `.env` file
- **Better Logging**: Timestamped, emoji-enhanced logs
- **Error Recovery**: Graceful handling of network issues
- **Incremental Updates**: Preserves user-added data on re-scrape
- **Modular Code**: Clean, maintainable structure

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd subh-movie-tracker

# Install dependencies
npm install

# Copy environment template (optional)
# The script will work with defaults if .env doesn't exist
# cp .env.example .env
```

### First Run - Migrate Existing Data

If you have existing CSV files, migrate them to the new schema:

```bash
npm run migrate
```

This will:
- Add new columns (watchedDate, notes, tags, etc.)
- Create backups of original files
- Preserve all existing data

### Usage

#### Fetch Latest Data
```bash
npm start
# or
npm run fetch
```

This will:
1. Scrape watched movies, watchlist, and shows
2. Back up existing CSV files
3. Update CSV files (preserving your notes/tags)
4. Generate statistics (STATS.md)
5. Create HTML dashboard (index.html)

#### Generate Statistics Only
```bash
npm run stats
```

Creates/updates `STATS.md` with:
- Total counts and averages
- Rating distributions
- Top-rated content
- Watching patterns
- Tag analysis

#### Generate HTML Report Only
```bash
npm run report
```

Creates/updates `index.html` - open in browser to view beautiful visualizations.

## 📁 Files Structure

```
subh-movie-tracker/
├── movies.js                  # Main scraper script
├── package.json              # Dependencies and scripts
├── .env                      # Configuration (not in git)
├── .env.example             # Configuration template
├── watched_titles.csv       # Movies you've watched
├── wants_titles.csv         # Movies you want to watch
├── shows_titles.csv         # TV shows you're tracking
├── STATS.md                 # Generated statistics report
├── index.html               # Generated HTML dashboard
├── backups/                 # Timestamped backups (not in git)
└── utils/
    ├── analytics.js         # Statistics generation
    ├── htmlReport.js        # HTML dashboard generation
    └── migrate.js           # Data migration utility
```

## 📊 CSV Schema

Each CSV file has the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `title` | Movie/show title | "Inception" |
| `rating` | Your rating (1-10 or N/A) | "9" |
| `watchedDate` | When you watched it (YYYY-MM-DD) | "2025-01-15" |
| `scrapedDate` | When data was scraped | "2025-10-05" |
| `notes` | Your personal notes | "Amazing plot twists!" |
| `tags` | Semicolon-separated tags | "favorite;mind-bending" |
| `rewatched` | Have you rewatched it? | "true" or "false" |

### Editing CSV Files

You can manually edit CSV files to:
- Add notes and reviews
- Add custom tags
- Set watch dates
- Mark items as rewatched

**Important**: The scraper preserves these fields when updating!

## ⚙️ Configuration

Create a `.env` file to customize behavior:

```bash
# Must App Username
MUST_USERNAME=subhransu

# Timeouts (milliseconds)
PAGE_TIMEOUT=180000
NAVIGATION_TIMEOUT=180000

# Auto-scroll settings
SCROLL_DISTANCE=100
SCROLL_DELAY=100

# Enable/Disable features
FETCH_WATCHED=true
FETCH_WANTS=true
FETCH_SHOWS=true
GENERATE_STATS=true
GENERATE_HTML_REPORT=true

# Backup settings
CREATE_BACKUP=true
BACKUP_DIR=backups
```

## 🎨 Customization Ideas

### Add Custom Tags

Edit your CSV files and add tags:
```csv
title,rating,watchedDate,scrapedDate,notes,tags,rewatched
Inception,9,2025-01-15,2025-10-05,Mind-blowing,favorite;sci-fi;mind-bending,false
```

### Track Watch Dates

Set the `watchedDate` column to see patterns in `STATS.md`:
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

Your repository can run this automatically! The workflow:
1. Runs on schedule (e.g., daily)
2. Fetches latest data
3. Commits changes back to repo
4. Git history = complete tracking history!

## 📈 Statistics Examples

The `STATS.md` file includes:

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

1. **Regular Scraping**: Run daily to track changes
2. **Git Commits**: Commit CSV changes to track history
3. **Backup Folder**: Keep `backups/` in `.gitignore` (local only)
4. **Add Metadata**: Regularly add notes and tags to your CSVs
5. **Review Stats**: Check `STATS.md` to discover patterns

## 🐛 Troubleshooting

### Scraping Fails
- Check your internet connection
- Verify username in `.env` or code
- Increase timeout values in `.env`
- Check if Must app changed their HTML structure

### Migration Issues
- Backup files are created automatically
- Original files saved as `*_backup_pre_migration.csv`
- Re-run `npm run migrate` if needed

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

*Generated and maintained with ❤️ by automated scraping*
