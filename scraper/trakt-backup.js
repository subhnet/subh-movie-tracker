/**
 * Trakt backup: pulls a public Trakt profile and writes
 *   public/watched_titles.csv, public/wants_titles.csv, public/shows_titles.csv
 *   backups/trakt-latest.json  (full dump, see DUMP_FILE)
 *   docs/STATS.md
 *
 * Needs only a Trakt client id (the profile must be public). Run by
 * .github/workflows/trakt-backup.yaml; run locally with `npm run backup`.
 *
 * Env: TRAKT_CLIENT_ID (required), TRAKT_USERNAME (default subhnet),
 *      TRAKT_TIMEZONE (default Asia/Kolkata, used for watched dates),
 *      FORCE=true (skip the shrink safety check).
 */
const fs = require('fs').promises;
const path = require('path');

const API = 'https://api.trakt.tv';
const GET_GAP_MS = 300;
const PAGE_SIZE = 500;
// Trakt's JSON dump lives in docs/ because backups/ is gitignored (local-only CSV snapshots).
const DUMP_FILE = path.join('docs', 'trakt-backup.json');
const FILES = {
  watched: path.join('public', 'watched_titles.csv'),
  wants: path.join('public', 'wants_titles.csv'),
  shows: path.join('public', 'shows_titles.csv'),
};
const COLUMNS = ['title', 'rating', 'watchedDate', 'notes', 'tags', 'rewatched', 'year', 'imdb'];
const MIN_KEEP_RATIO = 0.9;

// ---------- Pure helpers (unit-tested) ----------

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  const lines = [COLUMNS.join(',')];
  for (const row of rows) lines.push(COLUMNS.map((c) => csvCell(row[c])).join(','));
  return lines.join('\n') + '\n';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some((c) => c !== '')) rows.push(row); }
  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

function dateInZone(iso, timeZone) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

// Notes/tags have no Trakt equivalent, so they are carried over from the previous CSV.
// Match by imdb id once the CSV has it, otherwise by title in file order (duplicate titles
// such as remakes get their own row back positionally).
function createCarryOver(existingRows) {
  const byImdb = new Map();
  const byTitle = new Map();
  for (const row of existingRows) {
    const keep = { notes: row.notes || '', tags: row.tags || '' };
    if (row.imdb) byImdb.set(row.imdb, keep);
    else {
      const queue = byTitle.get(row.title) ?? [];
      queue.push(keep);
      byTitle.set(row.title, queue);
    }
  }
  return (title, imdb) => (imdb && byImdb.get(imdb)) || byTitle.get(title)?.shift() || { notes: '', tags: '' };
}

const ratingOf = (map, id) => (map.get(id) != null ? String(map.get(id)) : 'N/A');

const byDateThenTitle = (a, b) =>
  (b._sort || '').localeCompare(a._sort || '') || a.title.localeCompare(b.title) || (a.year || 0) - (b.year || 0);

function buildWatchedRows({ watched, ratings }, existing, timeZone) {
  const ratingById = new Map(ratings.map((r) => [r.movie.ids.trakt, r.rating]));
  const carry = createCarryOver(existing);
  return watched
    .map((w) => {
      const m = w.movie;
      return {
        title: m.title,
        rating: ratingOf(ratingById, m.ids.trakt),
        watchedDate: dateInZone(w.last_watched_at, timeZone),
        ...carry(m.title, m.ids.imdb),
        rewatched: w.plays > 1 ? 'true' : 'false',
        year: m.year ?? '',
        imdb: m.ids.imdb ?? '',
        _sort: w.last_watched_at,
      };
    })
    .sort(byDateThenTitle);
}

function buildWantRows({ watchlist }, existing) {
  const carry = createCarryOver(existing);
  return watchlist
    .map((w) => {
      const m = w.movie;
      return {
        title: m.title,
        rating: 'N/A',
        watchedDate: '',
        ...carry(m.title, m.ids.imdb),
        rewatched: 'false',
        year: m.year ?? '',
        imdb: m.ids.imdb ?? '',
        _sort: w.listed_at,
      };
    })
    .sort(byDateThenTitle);
}

function buildShowRows({ watched, watchlist, ratings }, existing) {
  const ratingById = new Map(ratings.map((r) => [r.show.ids.trakt, r.rating]));
  const carry = createCarryOver(existing);
  const shows = new Map();
  for (const w of watched) shows.set(w.show.ids.trakt, { show: w.show, sort: w.last_watched_at });
  for (const w of watchlist) if (!shows.has(w.show.ids.trakt)) shows.set(w.show.ids.trakt, { show: w.show, sort: '' });
  return [...shows.values()]
    .map(({ show, sort }) => ({
      title: show.title,
      rating: ratingOf(ratingById, show.ids.trakt),
      watchedDate: '',
      ...carry(show.title, show.ids.imdb),
      rewatched: 'false',
      year: show.year ?? '',
      imdb: show.ids.imdb ?? '',
      _sort: sort,
    }))
    .sort(byDateThenTitle);
}

// Fewer rows than before usually means a partial/failed API response, not real deletions.
function shrinkProblems(counts, previous, ratio = MIN_KEEP_RATIO) {
  return Object.keys(counts)
    .filter((k) => previous[k] > 0 && counts[k] < previous[k] * ratio)
    .map((k) => `${k}: ${counts[k]} rows vs ${previous[k]} in the committed CSV`);
}

const compactIds = (ids) => ({ trakt: ids.trakt, imdb: ids.imdb ?? null, tmdb: ids.tmdb ?? null });
const compactMovie = (m) => ({ title: m.title, year: m.year ?? null, ids: compactIds(m.ids) });
const compactShow = compactMovie;

// Stable ordering + one record per line, so daily git diffs only show real changes.
function buildDump(data) {
  const sortBy = (list, ...keys) =>
    [...list].sort((a, b) => keys.map((k) => String(k(b)).localeCompare(String(k(a)))).find((n) => n) || 0);
  return {
    movies: {
      watched: sortBy(data.movies.watched, (w) => w.last_watched_at, (w) => w.movie.ids.trakt).map((w) => ({
        plays: w.plays, last_watched_at: w.last_watched_at, movie: compactMovie(w.movie),
      })),
      history: sortBy(data.movies.history, (h) => h.watched_at, (h) => h.id).map((h) => ({
        id: h.id, watched_at: h.watched_at, movie: compactMovie(h.movie),
      })),
      ratings: sortBy(data.movies.ratings, (r) => r.rated_at, (r) => r.movie.ids.trakt).map((r) => ({
        rating: r.rating, rated_at: r.rated_at, movie: compactMovie(r.movie),
      })),
      watchlist: sortBy(data.movies.watchlist, (w) => w.listed_at, (w) => w.movie.ids.trakt).map((w) => ({
        listed_at: w.listed_at, movie: compactMovie(w.movie),
      })),
    },
    shows: {
      watched: sortBy(data.shows.watched, (w) => w.last_watched_at, (w) => w.show.ids.trakt).map((w) => ({
        plays: w.plays, last_watched_at: w.last_watched_at, show: compactShow(w.show),
      })),
      history: sortBy(data.shows.history, (h) => h.watched_at, (h) => h.id).map((h) => ({
        id: h.id, watched_at: h.watched_at, show: compactShow(h.show), season: h.episode.season, episode: h.episode.number,
      })),
      ratings: sortBy(data.shows.ratings, (r) => r.rated_at, (r) => r.show.ids.trakt).map((r) => ({
        rating: r.rating, rated_at: r.rated_at, show: compactShow(r.show),
      })),
      watchlist: sortBy(data.shows.watchlist, (w) => w.listed_at, (w) => w.show.ids.trakt).map((w) => ({
        listed_at: w.listed_at, show: compactShow(w.show),
      })),
    },
  };
}

function serializeDump(dump, meta) {
  const parts = Object.entries(dump).map(([group, sections]) => {
    const inner = Object.entries(sections).map(([name, list]) => {
      const body = list.map((item) => `    ${JSON.stringify(item)}`).join(',\n');
      return `  ${JSON.stringify(name)}: [${list.length ? `\n${body}\n  ` : ''}]`;
    });
    return ` ${JSON.stringify(group)}: {\n${inner.join(',\n')}\n }`;
  });
  return `{\n "username": ${JSON.stringify(meta.username)},\n "counts": ${JSON.stringify(meta.counts)},\n${parts.join(',\n')}\n}\n`;
}

// ---------- Trakt client ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createClient({ clientId, username, fetchImpl = fetch, gapMs = GET_GAP_MS }) {
  let nextAt = 0;

  async function request(pathname) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const wait = nextAt - Date.now();
      if (wait > 0) await sleep(wait);
      nextAt = Date.now() + gapMs;
      const res = await fetchImpl(`${API}${pathname}`, {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': clientId,
          'User-Agent': 'subh-movie-tracker-backup/1.0',
        },
      });
      // 420/429 are rate limits, 5xx are transient; back off and retry.
      if ([420, 429].includes(res.status) || res.status >= 500) {
        await sleep((Number(res.headers.get('retry-after')) || 5 * 2 ** attempt) * 1000);
        continue;
      }
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        throw new Error(`Trakt returned HTTP ${res.status} for ${pathname}. Is TRAKT_CLIENT_ID valid and the profile "${username}" public?`);
      }
      if (!res.ok) throw new Error(`Trakt returned HTTP ${res.status} for ${pathname}`);
      const text = await res.text();
      let data;
      try { data = text.trim() ? JSON.parse(text) : []; }
      catch { throw new Error(`Trakt returned non-JSON for ${pathname}: ${text.slice(0, 120)}`); }
      return { data, pages: Number(res.headers.get('x-pagination-page-count')) || 1 };
    }
    throw new Error(`Trakt kept rate-limiting/failing for ${pathname}`);
  }

  return {
    async getAll(resource) {
      const all = [];
      let pages = 1;
      for (let page = 1; page <= pages; page++) {
        const sep = resource.includes('?') ? '&' : '?';
        const res = await request(`/users/${encodeURIComponent(username)}/${resource}${sep}page=${page}&limit=${PAGE_SIZE}`);
        if (!Array.isArray(res.data)) throw new Error(`Unexpected Trakt response for ${resource}`);
        all.push(...res.data);
        pages = res.pages;
      }
      return all;
    },
  };
}

async function fetchProfile(client, log = () => {}) {
  const get = async (resource) => { log(`Fetching ${resource}`); return client.getAll(resource); };
  return {
    movies: {
      watched: await get('watched/movies'),
      history: await get('history/movies'),
      ratings: await get('ratings/movies'),
      watchlist: await get('watchlist/movies'),
    },
    shows: {
      watched: await get('watched/shows?extended=noseasons'),
      history: await get('history/shows'),
      ratings: await get('ratings/shows'),
      watchlist: await get('watchlist/shows'),
    },
  };
}

// ---------- Main ----------

async function readExisting(file) {
  try { return parseCsv(await fs.readFile(file, 'utf8')); } catch { return []; }
}

async function writeIfChanged(file, content) {
  try { if ((await fs.readFile(file, 'utf8')) === content) return; } catch {}
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

async function main() {
  try { require('dotenv').config(); } catch {} // optional: CI passes env vars directly
  const clientId = process.env.TRAKT_CLIENT_ID;
  const username = process.env.TRAKT_USERNAME || 'subhnet';
  const timeZone = process.env.TRAKT_TIMEZONE || 'Asia/Kolkata';
  if (!clientId) throw new Error('TRAKT_CLIENT_ID is not set.');

  const log = (m) => console.log(`· ${m}`);
  const data = await fetchProfile(createClient({ clientId, username }), log);

  const existing = {
    watched: await readExisting(FILES.watched),
    wants: await readExisting(FILES.wants),
    shows: await readExisting(FILES.shows),
  };
  const rows = {
    watched: buildWatchedRows({ watched: data.movies.watched, ratings: data.movies.ratings }, existing.watched, timeZone),
    wants: buildWantRows({ watchlist: data.movies.watchlist }, existing.wants),
    shows: buildShowRows({ watched: data.shows.watched, watchlist: data.shows.watchlist, ratings: data.shows.ratings }, existing.shows),
  };
  const counts = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length]));
  const previous = Object.fromEntries(Object.entries(existing).map(([k, v]) => [k, v.length]));
  log(`Trakt rows: ${JSON.stringify(counts)} (committed CSVs: ${JSON.stringify(previous)})`);

  const problems = shrinkProblems(counts, previous);
  if (problems.length && process.env.FORCE !== 'true') {
    throw new Error(`Refusing to overwrite the backup, row counts dropped:\n  ${problems.join('\n  ')}\nRe-run with FORCE=true if this is expected.`);
  }

  // Nothing is written until every fetch and check above has succeeded.
  for (const key of Object.keys(FILES)) await writeIfChanged(FILES[key], toCsv(rows[key]));
  await writeIfChanged(DUMP_FILE, serializeDump(buildDump(data), { username, counts }));
  log(`Wrote ${Object.values(FILES).join(', ')} and ${DUMP_FILE}`);

  await require('./analytics').generateStatistics();
}

module.exports = {
  csvCell, toCsv, parseCsv, dateInZone, createCarryOver, buildWatchedRows, buildWantRows,
  buildShowRows, shrinkProblems, buildDump, serializeDump, createClient, fetchProfile,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`\n❌ Trakt backup failed: ${error.message}`);
    process.exit(1);
  });
}
