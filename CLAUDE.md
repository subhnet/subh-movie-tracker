# CLAUDE.md

Guidance for Claude Code (and future you) when working in this repo.

## What this is

A personal movie/show tracker. Started as a Puppeteer scraper
(`scraper/movies.js`) that pulls watched/want-to-watch/shows lists from the
Must app into CSV files and generates a markdown stats report. It has since
grown into a full Next.js app (`app/`) backed by Supabase, with the CSV/scraper
pipeline still running daily as a historical/git-tracked data trail.

There are effectively two data paths — know which one you're touching:

1. **Live app path (primary):** Next.js UI → `/api/user-movies` → Supabase.
   This is what the deployed dashboard actually reads and writes
   (`app/components/ClientDashboard.tsx` calls `/api/user-movies`).
2. **CSV/scraper path (secondary, git history + fallback):** `scraper/movies.js`
   scrapes Must → writes `data/watched_titles.csv` / `data/wants_titles.csv` /
   `data/shows_titles.csv` → `scraper/analytics.js` generates `docs/STATS.md` →
   `scraper/sync-to-supabase.js` upserts the CSVs into Supabase. This whole
   chain runs daily via `.github/workflows/fetch-titles.yaml` and commits the
   CSV/stat changes back to the repo, so **git log on the CSVs and
   `docs/STATS.md` is the watch history over time.** `/api/movies` and
   `/api/stats` read CSVs directly via `lib/csv-reader.ts` but aren't called by
   any current page — treat them as legacy/fallback, not the live data source.

## Folder layout

```
├── app/                 # Next.js App Router (pages, API routes, components)
├── lib/                 # Server-side helpers for the app (supabase client, csv-reader, auth, ai-service)
├── scraper/             # The scrape → CSV → stats → Supabase-sync pipeline
│   ├── movies.js        # Puppeteer scraper entrypoint
│   ├── analytics.js     # docs/STATS.md generation
│   ├── htmlReport.js    # Legacy index.html dashboard generation
│   ├── migrate.js       # One-time CSV schema migration
│   └── sync-to-supabase.js  # Upserts CSVs into Supabase
├── scripts/             # One-off/maintenance scripts (metadata refresh, debug), unrelated to scraper/
├── data/                # Canonical scraped data (watched/wants/shows_titles.csv)
├── docs/                # Docs & generated reports (STATS.md, supabase-schema.sql, migrations/)
├── outputs/             # Archived old generated artifacts (e.g. index.html.old)
├── public/              # Static assets + CSV mirrors (see "public/ CSV mirror" below)
├── ios/                 # Capacitor iOS wrapper
└── .github/workflows/fetch-titles.yaml   # Daily scrape → stats → Supabase sync → commit
```

`lib/` vs `scraper/` vs `scripts/` is a real distinction, not just naming: `lib/`
is imported by the live Next.js app at request time; `scraper/` is the
standalone Node pipeline invoked by `npm run fetch`/the GitHub Action and never
imported by `app/`; `scripts/` is manually-run maintenance tooling invoked
directly, never scheduled. `docs/` and `outputs/` were split out from root so
history/reference material (generated stats, SQL schema/migrations, an old
HTML dashboard snapshot) doesn't clutter the working root alongside live code
and data. (Reorganized 2026-08-17 — `scraper/` was previously named `utils/`
with `movies.js` living at repo root; `data/`, `docs/`, `outputs/` didn't exist
and those files lived at root too.)

## public/ CSV mirror — read this before touching CSV paths

`lib/csv-reader.ts` tries `public/<file>.csv` first when `VERCEL=1`, then falls
back to `data/<file>.csv`. The `public/` copies exist because Vercel's
serverless function file-tracing doesn't reliably bundle files that are only
referenced via a dynamically-built path — copying them into `public/` (which is
always included as a static asset) was the workaround.

**This means `public/*.csv` must be kept in sync with `data/*.csv`.** The
GitHub Action does this automatically (`Mirror CSVs to public/` step, added
2026-08-17) after every scrape, and commits both locations
(`file_pattern: "data/*.csv public/*.csv docs/STATS.md"`). Before that step
existed, `public/` silently went stale (last real sync was 2026-01-06 vs. daily
updates to the canonical CSVs) — if you ever see `/api/movies` or the
CSV-fallback path in `/api/user-movies` serving old data in production, check
this sync first.

If you ever change the CSV filenames or add a new CSV, update it in **four**
places: `scraper/movies.js` (writer), `lib/csv-reader.ts` (reader), the GitHub
Action's mirror step + `file_pattern`, and `docker-compose.yml`'s volume mounts.

## Commands

```bash
npm run dev              # Next.js dev server
npm run build / start     # Production build/serve

npm run fetch             # Run the Puppeteer scraper (scraper/movies.js) — writes CSVs, docs/STATS.md
npm run stats             # Regenerate docs/STATS.md only, from existing CSVs
npm run report            # Regenerate index.html dashboard only (legacy, rarely used)
npm run migrate           # One-time CSV schema migration (adds notes/tags/watchedDate cols)
npm run refresh-metadata  # scripts/refresh-metadata.js — backfills poster/overview via TMDB
```

`node scraper/sync-to-supabase.js` pushes the current `data/*.csv` files into
Supabase (upsert, keyed by title+user) — this is what the GitHub Action runs
after `scraper/movies.js`, requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Data model notes

- CSV columns: `title, rating, watchedDate, scrapedDate, notes, tags, rewatched`.
  Rating is `1-10` or `N/A`. Tags are semicolon-separated. On disk the writer
  (`ObjectsToCsv`) always emits columns alphabetically (`notes, rating,
  rewatched, scrapedDate, tags, title, watchedDate`) regardless of this
  conceptual order — harmless since every reader parses by header name, not
  position, but don't rely on column position when scripting against these
  files.
- Duplicate titles (e.g. a remake sharing its title with the original — Must
  doesn't disambiguate by year) can legitimately appear more than once in the
  same CSV with different ratings/notes. `saveTitlesToFile` in
  `scraper/movies.js` matches duplicates to their prior row *positionally* (in
  file order) rather than by a unique key, since Must gives no better
  identifier — this preserves each duplicate's own notes/tags/watchedDate
  across scrapes as long as Must's list order for that title stays stable.
- Supabase is the real source of truth for the live app; see
  `docs/supabase-schema.sql` for the table definitions and `docs/migrations/`
  for schema changes applied since (chronological, not auto-applied — run
  manually against Supabase when needed).
- `lib/auth.ts` / `lib/auth-server.ts` / `lib/jwt.ts` implement custom
  username+password auth (bcrypt) plus Google OAuth, not Supabase Auth
  directly — `docs/migrations/fix_rls_for_custom_auth.sql` exists because RLS
  policies had to be adapted for that.

## Exporting/backing up your data

- The full watch history already lives in git — `git log -- data/watched_titles.csv`
  (or `docs/STATS.md`) gives you a dated history of every scrape.
- For a point-in-time export, the three CSVs in `data/` are the whole dataset;
  they're plain CSV so they open directly in Sheets/Excel/Numbers.
- `backups/` (gitignored) accumulates timestamped pre-scrape snapshots when
  `CREATE_BACKUP=true` — safe to prune periodically, not required for recovery
  since git history covers it.

## Known rough edges (not fixed, just flagged)

- `docker-compose.yml` mounts `./index.html:/app/index.html`, but no
  `index.html` currently exists at repo root (the GitHub Action runs with
  `GENERATE_HTML_REPORT=false`). Harmless unless you re-enable HTML report
  generation and expect Docker to pick it up.
- `/api/movies` and `/api/stats` (CSV-only, no Supabase) don't appear to be
  called from any current page — likely safe to remove later, but left as-is
  since they're not causing harm.
