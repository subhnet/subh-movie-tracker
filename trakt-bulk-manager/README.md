# Trakt Bulk Manager (local-first)

A personal local web app for managing your own Trakt watchlist, ratings, and custom lists in bulk. Trakt remains the source of truth. No cloud service or third-party database is used.

## Current MVP

- Trakt device-code authentication (no client secret and no local OAuth callback URL).
- Fetch movie/show watchlists, watched history/collection, ratings, and personal lists.
- Search, filter, and select visible movies/shows.
- Bulk set/remove ratings.
- Bulk mark items as watched or remove from watched history.
- Bulk add/remove movies or shows to/from a custom list.
- Download a paginated JSON backup of movie/show watchlists, watched collection, ratings, movie/show watched history, and custom-list contents.
- Explicit confirmation before every bulk mutation.
- **Verify Must Export**: compares a Must export folder (default `exports_2/` at the repo root) with live Trakt and syncs what is missing (see below).

## Requirements

- Node.js 20+
- npm 10+
- A Trakt API application and its Client ID: https://trakt.tv/oauth/applications

## Setup

1. Create a Trakt API application. Use the Client ID only; this app uses OAuth Device Code Flow.
2. Copy `server/.env.example` to `server/.env` and set `TRAKT_CLIENT_ID`.
3. From this folder run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local UI at http://127.0.0.1:5173.
5. Click **Connect Trakt**, open the verification URL, enter the displayed code, then click **I've authorized**.

The API server binds only to `127.0.0.1:8787`. Local token/session files are stored under `server/.data/` and should never be committed or shared. The token file is created with owner-only permissions where supported. Tokens are stored locally in plaintext in this MVP; use full-disk encryption and do not share the `.data` folder. OS-keychain encryption is a planned hardening step.

## Verifying a Must export against Trakt

Reads `<user>_watched.csv`, `<user>_want.csv` and `<user>_shows.csv` from `exports_2/` and diffs them with Trakt. Use the **Verify Must Export** tab, or the CLI:

```bash
npm --workspace server run reconcile                      # dry run, prints totals and writes a report
npm --workspace server run reconcile -- --apply --limit=3 # try a small slice first
npm --workspace server run reconcile -- --apply           # sync everything applicable
npm --workspace server run reconcile -- --apply --only=missing-rating,missing-watchlist
```

What it checks and fixes:

| Category | Fix |
|---|---|
| `missing-watched` | Mark the movie watched on the Must date |
| `date-missing` | Add the Must date and remove the bulk-import placeholder watch (a day with 25+ movie watches). Dates within ±1 day count as matching |
| `missing-rating` / `rating-mismatch` | Set the Must rating |
| `missing-watchlist` | Add to watchlist (want movies, want/watching shows not started on Trakt) |
| `missing-show-watched` | Mark a watched show watched at release dates, only when Trakt has no episodes of it |
| `show-behind` / `show-partial` | Must only stores a watched-episode *count*, so this marks the first unwatched episodes (in order, specials excluded) as watched at their release dates until Trakt reaches Must's count. Approximate: it can't know which episodes you actually saw |
| `date-conflict`, `unresolved` | Report only |

Movies are matched by IMDb ID (verified against the year); duplicates or wrong IDs fall back to title+year search. Shows have no IDs in the export, so they are matched by title+year. To fix an `unresolved` item, add an override to `server/.data/reconcile-overrides.json`, keyed by `"<normalized title>|<year>"` (lowercase letters/digits only, e.g. `"thecenturyoftheself|2002"`) or by IMDb ID, with `{ "imdb": "tt..." }`, `{ "tmdb": 123 }` or `{ "trakt": 123 }`.

Safety: the diff is recomputed on the server for every sync, a raw snapshot of the Trakt data is saved to `server/.data/reconcile/pre-apply-*.json` before writing, replacement dates are added before placeholders are removed, and nothing else is ever deleted. Reports are written to `server/.data/reconcile/`.

## Build

```bash
npm run build
```

## Security and scope

- Do not publish this app or expose its API port to your LAN or the internet.
- Do not commit `.env` or `.data/` files.
- The app uses Trakt's documented API; it does not scrape Trakt pages.
- This is an independent app and is not endorsed or certified by Trakt.
- Always export a fresh backup before large bulk changes.

## Known MVP limitations

- Library list fetching in the UI currently uses the first API page; the JSON backup fetches paginated data.
- The custom-list page shows list metadata; selecting items from a custom list and editing list metadata are planned next.
- Smart Lists, audit-log persistence, batch progress/retry UI, CSV export, and ratings/history pagination in the interactive UI are planned next.
- Test with a small selection before large bulk operations; API response shapes and rate limits can evolve.
