/**
 * Conservative Must -> Trakt resolver.
 * - Reads the three Must CSVs from <project-root>/public.
 * - Uses TMDB search only for candidate discovery.
 * - Auto-selects only a single exact title candidate.
 * - Requires explicit overrides for ambiguous titles.
 * - Writes/reads a versioned cache so it does not reuse the old auto-picked IDs.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csvtojson');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config({ path: path.join(ROOT, '.env') });

const API_KEY = process.env.TMDB_API_KEY;
const PUBLIC_DIR = path.join(ROOT, 'public');
const EXPORTS_DIR = path.join(ROOT, 'exports', 'trakt');
const CACHE_FILE = path.join(EXPORTS_DIR, 'tmdb-search-cache-v2.json');
const OVERRIDES_FILE = path.join(PUBLIC_DIR, 'tmdb-overrides.csv');

const SOURCES = [
  { file: 'watched_titles.csv', list: 'watched', defaultType: 'movie', endpoints: ['movie'] },
  { file: 'wants_titles.csv', list: 'wants', defaultType: null, endpoints: ['movie', 'tv'] },
  { file: 'shows_titles.csv', list: 'shows', defaultType: 'show', endpoints: ['tv'] },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();
const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const toCsv = (header, rows) =>
  [header.join(','), ...rows.map((row) => header.map((field) => csvEscape(row[field])).join(','))].join('\n') + '\n';

function validRating(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{1,2}$/.test(text)) return '';
  const number = Number(text);
  return number >= 1 && number <= 10 ? String(number) : '';
}

function validDateOnly(value) {
  const text = String(value ?? '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return '';
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${text}T00:00:00Z`;
}

function endpointToType(endpoint) {
  return endpoint === 'tv' ? 'show' : 'movie';
}

function makeCandidate(result, endpoint) {
  const title = endpoint === 'tv' ? (result.name || '') : (result.title || '');
  const originalTitle = endpoint === 'tv' ? (result.original_name || '') : (result.original_title || '');
  const date = endpoint === 'tv' ? (result.first_air_date || '') : (result.release_date || '');
  return {
    tmdb_id: String(result.id),
    type: endpointToType(endpoint),
    matched_title: title,
    original_title: originalTitle,
    year: date.slice(0, 4),
    popularity: Number(result.popularity || 0),
  };
}

async function requestJson(url, context) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    } catch (error) {
      lastError = error;
      await sleep(500 * (attempt + 1));
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * (attempt + 1));
      lastError = new Error(`TMDB ${response.status} for ${context}`);
      continue;
    }
    if (!response.ok) throw new Error(`TMDB ${response.status} for ${context}`);
    return response.json();
  }
  throw lastError || new Error(`TMDB request failed for ${context}`);
}

async function searchTmdb(endpoint, title) {
  const key = `${endpoint}|${normalize(title)}`;
  if (Object.prototype.hasOwnProperty.call(searchCache, key)) return searchCache[key];

  const allResults = [];
  let pagesChecked = 0;
  // Search up to three result pages so exact-title remakes/duplicates are more likely to surface.
  for (let page = 1; page <= 3; page += 1) {
    const url = new URL(`https://api.themoviedb.org/3/search/${endpoint}`);
    url.searchParams.set('api_key', API_KEY);
    url.searchParams.set('query', title);
    url.searchParams.set('page', String(page));
    url.searchParams.set('include_adult', 'false');
    const data = await requestJson(url, `${endpoint} search for "${title}"`);
    allResults.push(...(data.results || []));
    pagesChecked = page;
    if (page >= Number(data.total_pages || 1) || page === 3) break;
    await sleep(150);
  }

  const want = normalize(title);
  const candidatesById = new Map();
  for (const result of allResults) {
    const candidate = makeCandidate(result, endpoint);
    if (!candidate.tmdb_id) continue;
    if (normalize(candidate.matched_title) === want || normalize(candidate.original_title) === want) {
      candidatesById.set(candidate.tmdb_id, candidate);
    }
  }
  const candidates = [...candidatesById.values()].sort((a, b) => b.popularity - a.popularity);
  const closest = allResults.slice(0, 5).map((result) => makeCandidate(result, endpoint));
  searchCache[key] = { candidates, closest, pages_checked: pagesChecked };
  await sleep(150);
  return searchCache[key];
}

let searchCache = {};

async function getTmdbDetails(endpoint, tmdbId) {
  const url = new URL(`https://api.themoviedb.org/3/${endpoint}/${encodeURIComponent(tmdbId)}`);
  url.searchParams.set('api_key', API_KEY);
  const data = await requestJson(url, `${endpoint} details for TMDB ID ${tmdbId}`);
  return makeCandidate(data, endpoint);
}

async function readOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    fs.writeFileSync(OVERRIDES_FILE, 'list,title,type,tmdb_id\n');
  }
  const rows = await csv().fromFile(OVERRIDES_FILE);
  const map = new Map();
  for (const row of rows) {
    const list = String(row.list || '').trim().toLowerCase();
    const title = normalize(row.title);
    const type = String(row.type || '').trim().toLowerCase();
    const tmdbId = String(row.tmdb_id || '').trim();
    if (!list || !title || !['movie', 'show'].includes(type) || !/^\d+$/.test(tmdbId)) continue;
    map.set(`${list}|${type}|${title}`, tmdbId);
  }
  return map;
}

const UNMATCHED_HEADER = ['list', 'title', 'rating', 'watchedDate', 'reason', 'closest_match', 'closest_tmdb_id'];
const AMBIGUOUS_HEADER = ['list', 'title', 'type', 'tmdb_id', 'matched_title', 'original_title', 'year', 'popularity'];
const REVIEW_HEADER = ['list', 'source_title', 'type', 'matched_title', 'year', 'tmdb_id', 'match_method', 'candidate_count'];

async function collectItems() {
  if (!API_KEY) throw new Error('Missing TMDB_API_KEY. Add it to the project-root .env.local file.');
  for (const source of SOURCES) {
    const filePath = path.join(PUBLIC_DIR, source.file);
    if (!fs.existsSync(filePath)) throw new Error(`Missing input CSV: ${filePath}`);
  }

  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  if (fs.existsSync(CACHE_FILE)) {
    try { searchCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
    catch { searchCache = {}; }
  }
  const overrides = await readOverrides();
  const items = [];
  const unmatched = [];
  const ambiguous = [];
  const review = [];
  const sourceCounts = {};

  for (const source of SOURCES) {
    const rows = await csv().fromFile(path.join(PUBLIC_DIR, source.file));
    sourceCounts[source.list] = rows.length;
    console.log(`${source.list}: ${rows.length} rows`);

    for (const row of rows) {
      const title = String(row.title || '').trim();
      if (!title) continue;

      let allCandidates = [];
      let closestCandidates = [];
      for (const endpoint of source.endpoints) {
        const result = await searchTmdb(endpoint, title);
        allCandidates.push(...result.candidates);
        closestCandidates.push(...result.closest);
      }
      const uniqueCandidates = [...new Map(allCandidates.map((candidate) => [`${candidate.type}|${candidate.tmdb_id}`, candidate])).values()];

      const overrideEntries = [...overrides.entries()].filter(([key]) => {
        const [list, , normalizedTitle] = key.split('|');
        return list === source.list && normalizedTitle === normalize(title);
      });
      if (overrideEntries.length > 1) {
        throw new Error(`Multiple TMDB overrides found for ${source.list} / "${title}". Keep exactly one override row.`);
      }
      let match = null;
      let matchMethod = 'exact-title';

      if (overrideEntries.length === 1) {
        const [overrideKey, overrideId] = overrideEntries[0];
        const [, overrideType] = overrideKey.split('|');
        const endpoint = overrideType === 'show' ? 'tv' : 'movie';
        if (!source.endpoints.includes(endpoint)) {
          throw new Error(`Override type ${overrideType} is not valid for ${source.list} / "${title}".`);
        }
        match = uniqueCandidates.find((candidate) => candidate.type === overrideType && candidate.tmdb_id === overrideId) || await getTmdbDetails(endpoint, overrideId);
        matchMethod = 'manual-override';
      } else if (uniqueCandidates.length === 1) {
        match = uniqueCandidates[0];
      } else if (uniqueCandidates.length > 1) {
        for (const candidate of uniqueCandidates) ambiguous.push({ list: source.list, title, ...candidate });
        unmatched.push({
          list: source.list, title, rating: row.rating, watchedDate: row.watchedDate,
          reason: 'ambiguous-exact-title-match',
          closest_match: uniqueCandidates.map((candidate) => `${candidate.matched_title} (${candidate.year || 'year unknown'}) [${candidate.type}, TMDB ${candidate.tmdb_id}]`).join(' | '),
          closest_tmdb_id: uniqueCandidates.map((candidate) => candidate.tmdb_id).join('|'),
        });
      } else {
        closestCandidates.sort((a, b) => b.popularity - a.popularity);
        unmatched.push({
          list: source.list, title, rating: row.rating, watchedDate: row.watchedDate,
          reason: 'no-exact-title-match',
          closest_match: closestCandidates[0] ? `${closestCandidates[0].matched_title} (${closestCandidates[0].year || 'year unknown'})` : '',
          closest_tmdb_id: closestCandidates[0] ? closestCandidates[0].tmdb_id : '',
        });
      }

      if (match) {
        const item = { list: source.list, type: match.type, title, row, match, matchMethod };
        items.push(item);
        review.push({
          list: source.list,
          source_title: title,
          type: match.type,
          matched_title: match.matched_title,
          year: match.year,
          tmdb_id: match.tmdb_id,
          match_method: matchMethod,
          candidate_count: uniqueCandidates.length,
        });
      }
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(searchCache, null, 2));
  }

  return { items, unmatched, ambiguous, review, sourceCounts, headers: { UNMATCHED_HEADER, AMBIGUOUS_HEADER, REVIEW_HEADER } };
}

module.exports = {
  ROOT,
  EXPORTS_DIR,
  collectItems,
  toCsv,
  validRating,
  validDateOnly,
  UNMATCHED_HEADER,
  AMBIGUOUS_HEADER,
  REVIEW_HEADER,
};
