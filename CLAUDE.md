# CLAUDE.md

Guidance for Claude Code (and future you) when working in this repo.

## What this is

A personal movie/show tracker. **Trakt is the source of truth** (the Must app
was retired in 2026-11). A daily GitHub Action (`scraper/trakt-backup.js`) reads
the public Trakt profile and writes the watched/want/shows CSVs, a full JSON
dump and `docs/STATS.md`, then commits them, so **git log on those files is the
watch history over time.** `trakt-bulk-manager/` is a separate local tool (Express
+ Vite) for bulk edits on Trakt and for the one-off Must-export reconcile.

The repo also contains a Next.js app (`app/`) backed by Supabase. Know which
data path you're touching:

1. **Backup path (git history):** Trakt → `scraper/trakt-backup.js` →
   `public/{watched,wants,shows}_titles.csv`, `docs/trakt-backup.json`,
   `docs/STATS.md` → committed by `.github/workflows/trakt-backup.yaml`.
2. **Live app path:** Next.js UI → `/api/user-movies` → Supabase
   (`app/components/ClientDashboard.tsx`). **Nothing refreshes Supabase any more**
   (`scraper/sync-to-supabase.js` was removed with the Must scraper), so the
   deployed dashboard's data is frozen at the last Must-era sync until a new
   Trakt→Supabase sync (or reading the CSVs/Trakt directly) is built.
   `/api/movies` and `/api/stats` read the CSVs via `lib/csv-reader.ts` but
   aren't called by any current page.

## Folder layout

```
├── app/                 # Next.js App Router (pages, API routes, components)
├── lib/                 # Server-side helpers for the app (supabase client, csv-reader, auth, ai-service)
├── scraper/             # The Trakt → CSV/JSON → stats backup pipeline
│   ├── trakt-backup.js  # Daily backup entrypoint (+ trakt-backup.test.js)
│   ├── analytics.js     # docs/STATS.md generation
│   └── backfill-posters.js  # Manual Supabase poster backfill, not scheduled
├── trakt-bulk-manager/  # Local Trakt bulk-edit tool + Must-export reconcile (own README)
├── scripts/             # One-off/maintenance scripts (metadata refresh, debug), unrelated to scraper/
├── public/              # THE canonical home for watched/wants/shows_titles.csv, plus Next.js static assets
├── docs/                # Docs & generated reports (STATS.md, trakt-backup.json, supabase-schema.sql, migrations/, archive/)
├── ios/                 # Capacitor iOS wrapper
└── .github/workflows/trakt-backup.yaml   # Daily Trakt backup → commit
```

`lib/` vs `scraper/` vs `scripts/` is a real distinction, not just naming:
`lib/` is imported by the live Next.js app at request time; `scraper/` is the
standalone Node pipeline invoked by `npm run backup`/the GitHub Action and never
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
`scraper/trakt-backup.js` writes there directly, `lib/csv-reader.ts` reads only from
there, and there is no mirror/sync step anymore.

If you ever change the CSV filenames or add a new CSV, update it in **three**
places: `scraper/trakt-backup.js` (writer), `lib/csv-reader.ts` (reader), and
`docker-compose.yml`'s volume mounts.

## Commands

```bash
npm run dev              # Next.js dev server
npm run build / start     # Production build/serve

npm run backup            # scraper/trakt-backup.js — Trakt → CSVs, docs/trakt-backup.json, docs/STATS.md (needs TRAKT_CLIENT_ID; profile must be public)
npm run test:backup       # Unit tests for the backup script (node --test)
npm run stats             # Regenerate docs/STATS.md only, from existing CSVs
npm run refresh-metadata  # scripts/refresh-metadata.js — backfills poster/overview via TMDB
npm run export-trakt      # scripts/export-trakt.js — builds Trakt CSV-import files in exports/trakt/ (gitignored); needs TMDB_API_KEY
npm run export-simkl      # scripts/export-simkl.js — builds Simkl CSV-import files in exports/simkl/ (gitignored); shares TMDB lookups/cache via scripts/lib/tmdb-resolve.js
```

The workflow needs one repo secret, `TRAKT_CLIENT_ID`. The username
(`TRAKT_USERNAME`) is set in `.github/workflows/trakt-backup.yaml`. The script
refuses to write (non-zero exit, nothing committed) if any Trakt fetch fails or
a list shrinks by more than 10% versus the committed CSV; `FORCE=true` skips
that check.

The old Must scraper, HTML report, CSV migrator and `sync-to-supabase.js` were
removed in 2026-11; recover them from git history (e.g. `git show
<commit>:scraper/movies.js`) if ever needed.

## Data model notes

- CSV columns, in on-disk order: `title, rating, watchedDate, notes, tags,
  rewatched, year, imdb`. Rating is `1-10` or `N/A`. Tags are
  semicolon-separated. `year`/`imdb` were added with the Trakt backup so
  remakes sharing a title can be told apart; every reader parses by header
  name, so extra columns are safe. `notes`/`tags` exist only in the CSVs (Trakt
  has no equivalent) and are carried over across backups — by `imdb` when the
  existing row has one, otherwise by title in file order. Everything else is
  overwritten from Trakt on each run, so edit ratings/dates on Trakt, not in
  the CSV. `watchedDate` is the latest play in `TRAKT_TIMEZONE` (default
  Asia/Kolkata); `rewatched` means more than one play. Wants' `watchedDate` is
  empty; shows' is empty too.
- There used to be a `scrapedDate` column, removed 2026-08-17. It was
  restamped with today's date for *every* row on *every* scrape (see
  the old Must scraper's `extractTitles`), which meant every daily commit
  rewrote every line of all three CSVs even when nothing about that row
  actually changed — turning the git history into noise instead of a useful
  diff-per-change log. It also silently broke `docs/STATS.md`'s "Recently
  Added to Watchlist" section (removed along with the column), since sorting
  by a value that's identical across every row on a given day never reflected
  true add order. If you need "when was this added" again, key it off
  something that only changes when the row is genuinely new/different — don't
  restamp unconditionally.
- Duplicate titles (e.g. a remake sharing its title with the original) can
  legitimately appear more than once in the same CSV. Rows are sorted
  deterministically (latest watch first, then title, then year) so daily
  commits only show real changes — keep it that way.
- Supabase backs the live app but is no longer refreshed (see top of this file); see
  `docs/supabase-schema.sql` for the table definitions and `docs/migrations/`
  for schema changes applied since (chronological, not auto-applied — run
  manually against Supabase when needed).
- `lib/auth.ts` / `lib/auth-server.ts` / `lib/jwt.ts` implement custom
  username+password auth (bcrypt) plus Google OAuth, not Supabase Auth
  directly — `docs/migrations/fix_rls_for_custom_auth.sql` exists because RLS
  policies had to be adapted for that.

## Exporting/backing up your data

- The full watch history already lives in git — `git log -- public/watched_titles.csv`
  (or `docs/STATS.md`) gives you a dated history of every backup. `docs/trakt-backup.json` adds per-play dates, episode-level show history, ratings and watchlists.
- For a point-in-time export, the three CSVs in `public/` are the whole
  dataset; they're plain CSV so they open directly in Sheets/Excel/Numbers.
- `backups/` (gitignored) is an optional place for local snapshots — not
  required for recovery since git history covers it.

## Known rough edges (not fixed, just flagged)

- `docker-compose.yml` still mounts `./index.html:/app/index.html` (the HTML
  report generator was removed, so the file never exists). Harmless.
- `/api/movies` and `/api/stats` (CSV-only, no Supabase) don't appear to be
  called from any current page — likely safe to remove later, but left as-is
  since they're not causing harm.
