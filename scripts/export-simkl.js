/**
 * Export the tracker CSVs into Simkl's CSV import format.
 *
 * Titles are resolved to TMDB ids (see scripts/lib/tmdb-resolve.js); Simkl
 * requires the Type column alongside TMDB_ID because ids overlap across movies/tv.
 *
 * Usage: npm run export-simkl
 * Needs TMDB_API_KEY in .env / .env.local.
 *
 * Output (exports/simkl/), upload each with Watchlist = "Use .csv data":
 *   simkl-movies.csv  watched movies (completed, date, rating, notes) + want-to-watch (plan to watch)
 *   simkl-shows.csv   shows as "plan to watch" with ratings (no episode data exists)
 *   unmatched.csv     titles with no exact TMDB title match (with closest guess) - fix by hand
 */

const fs = require('fs');
const path = require('path');
const { ROOT, collectItems, toCsv, validRating, UNMATCHED_HEADER } = require('./lib/tmdb-resolve');

const OUT_DIR = path.join(ROOT, 'exports', 'simkl');
// The importer docs say TMDB_ID but Simkl's own sample file uses TMDB; emit both with the same value.
const HEADER = ['Type', 'TMDB_ID', 'TMDB', 'Title', 'Year', 'Watchlist', 'WatchedDate', 'Rating', 'Memo'];

// Matches Simkl's sample file (M/D/YYYY); the tracker stores YYYY-MM-DD.
function simklDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1]}` : '';
}

async function main() {
  const { items, unmatched } = await collectItems();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const out = { movie: [], show: [] };
  const seen = new Set();

  for (const { list, type, match, row } of items) {
    const out_row = {
      Type: type === 'show' ? 'tv' : 'movie',
      TMDB_ID: match.id,
      TMDB: match.id,
      Title: match.matchedTitle,
      Year: match.year,
      Rating: validRating(row.rating),
      Memo: (row.notes || '').trim(),
    };

    if (list === 'watched') {
      out_row.Watchlist = 'completed';
      out_row.WatchedDate = simklDate(row.watchedDate);
    } else {
      out_row.Watchlist = 'plan to watch';
    }

    const dedupeKey = `${list}|${type}|${match.id}|${out_row.WatchedDate || ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    out[type].push(out_row);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'simkl-movies.csv'), toCsv(HEADER, out.movie));
  fs.writeFileSync(path.join(OUT_DIR, 'simkl-shows.csv'), toCsv(HEADER, out.show));
  fs.writeFileSync(path.join(OUT_DIR, 'unmatched.csv'), toCsv(UNMATCHED_HEADER, unmatched));

  console.log(`\nmovies: ${out.movie.length}, shows: ${out.show.length}`);
  console.log(`unmatched (see unmatched.csv): ${unmatched.length}`);
  console.log(`Written to ${path.relative(ROOT, OUT_DIR)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
