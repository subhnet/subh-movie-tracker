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
   scrapes Must → writes `public/watched_titles.csv` / `public/wants_titles.csv`
   / `public/shows_titles.csv` → `scraper/analytics.js` generates
   `docs/STATS.md` → `scraper/sync-to-supabase.js` upserts the CSVs into
   Supabase. This whole chain runs daily via
   `.github/workflows/fetch-titles.yaml` and commits the CSV/stat changes back
   to the repo, so **git log on the CSVs and `docs/STATS.md` is the watch
   history over time.** `/api/movies` and `/api/stats` read CSVs directly via
   `lib/csv-reader.ts` but aren't called by any current page — treat them as
   legacy/fallback, not the live data source.

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
├── public/              # THE canonical home for watched/wants/shows_titles.csv, plus Next.js static assets
├── docs/                # Docs, generated reports & dead artifacts (STATS.md, supabase-schema.sql, migrations/, archive/)
├── ios/                 # Capacitor iOS wrapper
└── .github/workflows/fetch-titles.yaml   # Daily scrape → stats → Supabase sync → commit
```

`lib/` vs `scraper/` vs `scripts/` is a real distinction, not just naming:
`lib/` is imported by the live Next.js app at request time; `scraper/` is the
standalone Node pipeline invoked by `npm run fetch`/the GitHub Action and never
imported by `app/`; `scripts/` is manually-run maintenance tooling invoked
directly, never scheduled. `docs/` holds everything that isn't live
code/data — including `docs/archive/` for dead generated artifacts (e.g.
`index.html.old`) — so history/reference material doesn't clutter root or
sit in its own single-purpose folder.

**Reorg history**, in case old references or muscle memory point at stale
paths: originally (before 2026-08-17) everything lived flat at repo root —
`movies.js`, `utils/*.js`, `watched_titles.csv` etc., `STATS.md`,
`supabase-schema.sql`, `migrations/`, `archive/index.html.old`. That was split
into `scraper/` (renamed from `utils/`, `movies.js` moved in), `docs/`
(STATS.md, schema, migrations), and a separate `data/` + `outputs/` for CSVs
and the old HTML snapshot respectively. `data/` and `outputs/` were then
immediately folded away again the same day: `data/` merged into `public/`
(single copy instead of two kept in sync — see below), and `outputs/` became
`docs/archive/`.

## Why the CSVs live in public/, not a separate data/ folder

`public/` is a hard Next.js convention — anything inside it is auto-served as
a static asset and, critically, is the one location Vercel's serverless
file-tracing always bundles (file-tracing doesn't reliably bundle files only
referenced via a dynamically-built path elsewhere in the repo). Since the
CSVs *have* to be in `public/` for production to work at all, keeping a second
copy in `data/` for "cleanliness" just meant two copies to keep in sync — and
for a while they silently drifted (see git history around 2026-08-17 for the
staleness incident this caused). `public/` is now the single source of truth:
`scraper/movies.js` writes there directly, `lib/csv-reader.ts` reads only from
there, and there is no mirror/sync step anymore.

If you ever change the CSV filenames or add a new CSV, update it in **three**
places: `scraper/movies.js` (writer), `lib/csv-reader.ts` (reader), and
`docker-compose.yml`'s volume mounts.

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

`node scraper/sync-to-supabase.js` pushes the current `public/*.csv` files
into Supabase (upsert, keyed by title+user) — this is what the GitHub Action
runs after `scraper/movies.js`, requires `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY`.

## Data model notes

- CSV columns, in on-disk order: `title, rating, watchedDate, scrapedDate,
  notes, tags, rewatched`. Rating is `1-10` or `N/A`. Tags are
  semicolon-separated. (The writer previously passed `allColumns: true` to
  `ObjectsToCsv`, which force-sorts columns alphabetically regardless of this
  order — fixed by passing `allColumns: false` instead, since every row always
  has the same 7 keys already. Every reader parses by header name anyway, so
  this was cosmetic, but don't reintroduce `allColumns: true` unless rows can
  have inconsistent shapes.)
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

- The full watch history already lives in git — `git log -- public/watched_titles.csv`
  (or `docs/STATS.md`) gives you a dated history of every scrape.
- For a point-in-time export, the three CSVs in `public/` are the whole
  dataset; they're plain CSV so they open directly in Sheets/Excel/Numbers.
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
