/**
 * Shared helpers for the export-* scripts: reads public/*.csv and resolves
 * every title to a TMDB id (cached in exports/tmdb-cache.json).
 */

const fs = require('fs');
const path = require('path');
const csv = require('csvtojson');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const ROOT = path.join(__dirname, '..', '..');
const EXPORTS_DIR = path.join(ROOT, 'exports');
const CACHE_FILE = path.join(EXPORTS_DIR, 'tmdb-cache.json');
// Earlier versions of export-trakt kept the cache next to its output.
const LEGACY_CACHE_FILE = path.join(EXPORTS_DIR, 'trakt', 'tmdb-cache.json');
const API_KEY = process.env.TMDB_API_KEY;

const SOURCES = [
  { file: 'watched_titles.csv', list: 'watched', type: 'movie', endpoint: 'movie' },
  { file: 'wants_titles.csv', list: 'wants', type: 'movie', endpoint: 'movie' },
  { file: 'shows_titles.csv', list: 'shows', type: 'show', endpoint: 'tv' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normalize = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const q = (v) => (/[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const toCsv = (header, rows) =>
  [header.join(','), ...rows.map((r) => header.map((h) => q(r[h] ?? '')).join(','))].join('\n') + '\n';

function validRating(r) {
  const n = Number(r);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? String(n) : '';
}

async function tmdbSearch(endpoint, title) {
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${API_KEY}&query=${encodeURIComponent(title)}&page=1`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`TMDB ${res.status} for "${title}"`);
    return (await res.json()).results || [];
  }
  throw new Error(`TMDB rate limited for "${title}"`);
}

function pickBest(results, title) {
  if (!results.length) return null;
  const want = normalize(title);
  const nameOf = (r) => r.title || r.name || '';
  const origOf = (r) => r.original_title || r.original_name || '';
  const exact = results.filter((r) => normalize(nameOf(r)) === want || normalize(origOf(r)) === want);
  const pool = exact.length ? exact : results.slice(0, 1);
  const best = pool.reduce((a, b) => ((b.popularity || 0) > (a.popularity || 0) ? b : a));
  return {
    id: best.id,
    matchedTitle: nameOf(best),
    year: (best.release_date || best.first_air_date || '').slice(0, 4),
    exact: exact.length > 0,
    candidates: exact.length,
  };
}

async function resolve(cache, endpoint, title) {
  const key = `${endpoint}|${title}`;
  if (key in cache) return cache[key];
  cache[key] = pickBest(await tmdbSearch(endpoint, title), title);
  await sleep(60);
  return cache[key];
}

/**
 * Returns { items, unmatched }. Each item: { list, type ('movie'|'show'), title, row, match }.
 * Only exact title matches become items; the rest go to unmatched with the closest guess.
 */
async function collectItems() {
  if (!API_KEY) {
    console.error('Missing TMDB_API_KEY in .env / .env.local');
    process.exit(1);
  }
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  const cacheSource = [CACHE_FILE, LEGACY_CACHE_FILE].find((f) => fs.existsSync(f));
  const cache = cacheSource ? JSON.parse(fs.readFileSync(cacheSource, 'utf8')) : {};
  const items = [];
  const unmatched = [];

  for (const src of SOURCES) {
    const rows = await csv().fromFile(path.join(ROOT, 'public', src.file));
    console.log(`${src.list}: ${rows.length} rows`);

    for (const row of rows) {
      const title = (row.title || '').trim();
      if (!title) continue;

      let type = src.type;
      let match = await resolve(cache, src.endpoint, title);
      // The want-to-watch list mixes in shows; retry those against TV search.
      if (src.list === 'wants' && !(match && match.exact)) {
        const tv = await resolve(cache, 'tv', title);
        if (tv && tv.exact) {
          match = tv;
          type = 'show';
        }
      }
      if (!match || !match.exact) {
        unmatched.push({
          list: src.list,
          title,
          rating: row.rating,
          watchedDate: row.watchedDate,
          closest_match: match ? `${match.matchedTitle} (${match.year})` : '',
          closest_tmdb_id: match ? match.id : '',
        });
        continue;
      }
      items.push({ list: src.list, type, title, row, match });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
  }
  return { items, unmatched };
}

const UNMATCHED_HEADER = ['list', 'title', 'rating', 'watchedDate', 'closest_match', 'closest_tmdb_id'];
const REVIEW_HEADER = ['list', 'title', 'matched_title', 'year', 'tmdb_id', 'exact_title_match', 'same_title_candidates'];
const reviewRow = ({ list, title, match }) => ({
  list,
  title,
  matched_title: match.matchedTitle,
  year: match.year,
  tmdb_id: match.id,
  exact_title_match: match.exact,
  same_title_candidates: match.candidates,
});

module.exports = { ROOT, collectItems, toCsv, validRating, UNMATCHED_HEADER, REVIEW_HEADER, reviewRow };
