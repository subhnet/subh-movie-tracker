/**
 * Export the backed-up Must CSV files into conservative Trakt import CSVs.
 *
 * Run from the project root with: npm run export-trakt
 * Requires Node.js 18+ and TMDB_API_KEY in .env.local (or .env).
 *
 * Outputs are written to exports/trakt/:
 *   trakt-watched-movies.csv   watched movies + ratings + approximate watch dates
 *   trakt-watchlist-movies.csv movie watchlist
 *   trakt-watchlist-shows.csv  show watchlist + ratings where available
 *   unmatched.csv              no exact TMDB title match or invalid watched date
 *   ambiguous.csv              multiple exact TMDB matches; requires manual override
 *   review.csv                 all successfully matched source rows
 *   duplicates.csv             identical duplicate watch events removed
 *   conflicts.csv              conflicting ratings for the same movie/date; skipped
 *
 * Before importing, review ambiguous.csv/unmatched.csv/conflicts.csv and rerun
 * after adding explicit choices to public/tmdb-overrides.csv.
 */

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  EXPORTS_DIR,
  collectItems,
  toCsv,
  validRating,
  validDateOnly,
  UNMATCHED_HEADER,
  AMBIGUOUS_HEADER,
  REVIEW_HEADER,
} = require('./lib/trakt-tmdb-resolve');

const OUT_DIR = EXPORTS_DIR;
const HEADER = ['tmdb_id', 'type', 'watched_at', 'watchlisted_at', 'rating', 'rated_at'];
const WATCHED_HEADER = HEADER;
const WATCHLIST_HEADER = HEADER;
const NOW = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

function writeCsv(filename, header, rows) {
  fs.writeFileSync(path.join(OUT_DIR, filename), toCsv(header, rows), 'utf8');
}

async function main() {
  const { items, unmatched, ambiguous, review, sourceCounts } = await collectItems();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const watchedGroups = new Map();
  const unmatchedRows = [...unmatched];
  const duplicates = [];
  const conflicts = [];
  const watchlistByKey = new Map();
  const watchlistRatingConflicts = new Set();

  for (const item of items) {
    const { list, type, match, row } = item;
    const tmdbId = String(match.tmdb_id);
    const rating = validRating(row.rating);

    if (list === 'watched') {
      const watchedAt = validDateOnly(row.watchedDate);
      if (!watchedAt) {
        unmatchedRows.push({
          list, title: item.title, rating: row.rating, watchedDate: row.watchedDate,
          reason: 'invalid-or-missing-watched-date', closest_match: match.matched_title,
          closest_tmdb_id: tmdbId,
        });
        continue;
      }
      const key = `${type}|${tmdbId}|${watchedAt}`;
      if (!watchedGroups.has(key)) watchedGroups.set(key, []);
      watchedGroups.get(key).push({ item, rating, watchedAt });
      continue;
    }

    // Both Must's wants list and shows list become Trakt watchlist entries.
    const key = `${type}|${tmdbId}`;
    const existing = watchlistByKey.get(key) || {
      tmdb_id: tmdbId,
      type,
      watched_at: '',
      watchlisted_at: NOW,
      rating: '',
      rated_at: '', // Must does not provide an independent rating timestamp.
      source_titles: [],
    };
    existing.source_titles.push(`${list}: ${item.title}`);
    if (rating) {
      if (watchlistRatingConflicts.has(key)) {
        // Keep the rating blank when any Must source disagrees.
      } else if (existing.rating && existing.rating !== rating) {
        conflicts.push({
          kind: 'watchlist-rating-conflict',
          type,
          tmdb_id: tmdbId,
          title: item.title,
          details: `Existing rating ${existing.rating}; additional rating ${rating}`,
          action: 'Review source rows and resolve manually before importing this item.',
        });
        existing.rating = '';
        watchlistRatingConflicts.add(key);
      } else if (!existing.rating) {
        existing.rating = rating;
      }
    }
    watchlistByKey.set(key, existing);
  }

  const watchedRows = [];
  for (const [key, group] of watchedGroups.entries()) {
    const ratings = [...new Set(group.map((entry) => entry.rating).filter(Boolean))];
    if (ratings.length > 1) {
      conflicts.push({
        kind: 'watched-rating-conflict',
        type: group[0].item.type,
        tmdb_id: group[0].item.match.tmdb_id,
        title: group.map((entry) => entry.item.title).join(' | '),
        details: `Same watched date ${group[0].watchedAt}; conflicting ratings: ${ratings.join(', ')}`,
        action: 'Conflicting event was excluded. Decide which rating is correct, then edit the source CSV to one row.',
      });
      continue;
    }

    const first = group[0];
    watchedRows.push({
      tmdb_id: String(first.item.match.tmdb_id),
      type: first.item.type,
      watched_at: first.watchedAt,
      watchlisted_at: '',
      rating: first.rating,
      rated_at: '',
    });

    if (group.length > 1) {
      duplicates.push({
        type: first.item.type,
        tmdb_id: String(first.item.match.tmdb_id),
        title: first.item.title,
        watched_at: first.watchedAt,
        copies: group.length,
        action: 'Identical duplicate event collapsed to one row.',
      });
    }
  }

  const watchlistRows = [...watchlistByKey.values()].map(({ source_titles, ...row }) => row);
  const movieWatchlist = watchlistRows.filter((row) => row.type === 'movie');
  const showWatchlist = watchlistRows.filter((row) => row.type === 'show');

  writeCsv('trakt-watched-movies.csv', WATCHED_HEADER, watchedRows);
  writeCsv('trakt-watchlist-movies.csv', WATCHLIST_HEADER, movieWatchlist);
  writeCsv('trakt-watchlist-shows.csv', WATCHLIST_HEADER, showWatchlist);
  writeCsv('unmatched.csv', UNMATCHED_HEADER, unmatchedRows);
  writeCsv('ambiguous.csv', AMBIGUOUS_HEADER, ambiguous);
  writeCsv('review.csv', REVIEW_HEADER, review);
  writeCsv('duplicates.csv', ['type', 'tmdb_id', 'title', 'watched_at', 'copies', 'action'], duplicates);
  writeCsv('conflicts.csv', ['kind', 'type', 'tmdb_id', 'title', 'details', 'action'], conflicts);

  const summary = {
    source_rows: sourceCounts,
    matched_source_rows: items.length,
    watched_events_exported: watchedRows.length,
    movie_watchlist_exported: movieWatchlist.length,
    show_watchlist_exported: showWatchlist.length,
    unmatched_or_invalid: unmatchedRows.length,
    ambiguous_candidates: ambiguous.length,
    duplicate_events_collapsed: duplicates.length,
    conflicts_excluded: conflicts.length,
    generated_at: NOW,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

  console.log('\nMigration export summary');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nFiles written to ${path.relative(ROOT, OUT_DIR)}/`);
  if (ambiguous.length || unmatchedRows.length || conflicts.length) {
    console.log('\nIMPORTANT: review ambiguous.csv, unmatched.csv and conflicts.csv before importing.');
  }
}

main().catch((error) => {
  console.error('\nExport failed:', error.message);
  process.exitCode = 1;
});
