# Must → Trakt migration helper

This is a safer version of the supplied `export-trakt.js` flow. It uses the three backed-up CSVs in `public/` and resolves titles to TMDB IDs. It does **not** connect to or modify your Trakt account; it only generates CSVs for you to upload manually.

## Requirements

- Node.js 18 or newer (uses the built-in `fetch`).
- A TMDB API key.

## Setup

1. Put your TMDB API key in `.env.local` at this project root:

   ```env
   TMDB_API_KEY=your_tmdb_api_key
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the exporter:

   ```bash
   npm run export-trakt
   ```

## Inputs

- `public/watched_titles.csv`
- `public/wants_titles.csv`
- `public/shows_titles.csv`
- `public/tmdb-overrides.csv` (optional manual corrections)

The override file has columns:

```csv
list,title,type,tmdb_id
watched,Drishyam,movie,123456
```

Use `list` = `watched`, `wants`, or `shows`; `type` = `movie` or `show`. The sample ID above is only a format example—replace it with the correct TMDB ID after checking the title/year. Do not copy it as a real match.

## Outputs

Generated under `exports/trakt/`:

- `trakt-watched-movies.csv` — one row per distinct movie watch event, with Must's date and rating.
- `trakt-watchlist-movies.csv` — movie watchlist entries.
- `trakt-watchlist-shows.csv` — show watchlist entries, including Must ratings where present.
- `unmatched.csv` — titles with no exact title match and invalid/missing watched dates.
- `ambiguous.csv` — multiple exact TMDB candidates; choose the correct ID via `public/tmdb-overrides.csv`.
- `review.csv` — mapping audit.
- `duplicates.csv` — identical same-title/ID/date events collapsed.
- `conflicts.csv` — conflicting ratings for the same TMDB item and watched date, excluded from import.
- `summary.json` — row counts.
- `tmdb-search-cache-v2.json` — cached search data. Safe to retain; it contains no API key.

## Important limitations

- Must's CSVs do not contain a release year, so same-name remakes/films cannot always be distinguished automatically. The script only auto-selects one exact candidate; multiple exact candidates are held back for manual resolution.
- The `watchedDate` field is imported as a date at 00:00 UTC. You said this date may be approximate; it should be treated as approximate in Trakt too.
- Must's `rewatched` field in this backup is false for every row. There is no separate rewatch-event history, so no extra rewatches are fabricated.
- Must's TV export contains show titles/ratings but no season- or episode-level watch history. This script adds shows to the watchlist and imports show ratings; it does not mark episodes watched.
- Must's current CSV backup contains no notes or tags. No reviews/tags can be migrated from these files.
- `rated_at` is intentionally blank because Must does not provide an independent rating timestamp.

## Before importing to Trakt

1. Inspect `ambiguous.csv`, `unmatched.csv`, and `conflicts.csv`.
2. Add manual choices to `public/tmdb-overrides.csv` and rerun until the unresolved list is acceptable.
3. Test each output with a very small sample in Trakt's importer first. Confirm the preview identifies movies and shows correctly.
4. Import the remaining rows only after the sample succeeds.
5. Save a fresh Trakt raw export after migration.

The script does not call Trakt's API, and it does not change your account. All imports remain under your control.
