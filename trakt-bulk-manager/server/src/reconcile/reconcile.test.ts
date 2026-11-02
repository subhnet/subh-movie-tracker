import assert from "node:assert/strict";
import { test } from "node:test";
import { applyReport } from "./apply.js";
import { parseCsv } from "./csv.js";
import { buildReport, hasNearbyEvent } from "./diff.js";
import { parseMovieRows } from "./parse.js";
import { fetchTraktState } from "./state.js";
import type { MovieRow, Resolution, ShowRow, TraktState } from "./types.js";

test("parseCsv handles quotes, commas, CRLF and BOM", () => {
  const rows = parseCsv('\uFEFFa,b\r\n"x, ""y""",2\r\n,\r\nlast,3');
  assert.deepEqual(rows, [
    { a: 'x, "y"', b: "2" },
    { a: "last", b: "3" },
  ]);
});

test("parseMovieRows rejects bad ids, ratings and dates", () => {
  const [r] = parseMovieRows("imdbID,Title,Year,Rating10,WatchedDate,Review\n,T,2020,N/A,bad,", "watched");
  assert.equal(r.imdb, "");
  assert.equal(r.rating, null);
  assert.equal(r.date, "");
  assert.equal(r.year, 2020);
});

test("hasNearbyEvent tolerates a one-day shift but not more", () => {
  assert.ok(hasNearbyEvent(["2026-10-23T00:00:00Z"], "2026-10-22"));
  assert.ok(hasNearbyEvent(["2026-10-21T18:30:00Z"], "2026-10-22"));
  assert.ok(!hasNearbyEvent(["2026-10-25T00:00:00Z"], "2026-10-22"));
});

const emptyState = (over: Partial<TraktState> = {}): TraktState => ({
  movieHistory: [],
  placeholderDays: new Set(),
  watchedMovies: new Set(),
  watchedShows: new Map(),
  movieRatings: new Map(),
  showRatings: new Map(),
  movieWatchlist: new Set(),
  showWatchlist: new Set(),
  movieByImdb: new Map(),
  raw: {},
  ...over,
});

const movie = (o: Partial<MovieRow>): MovieRow => ({
  source: "watched",
  line: 2,
  imdb: "tt1",
  title: "A",
  year: 2020,
  rating: 7,
  date: "2026-10-22",
  ...o,
});

const show = (o: Partial<ShowRow>): ShowRow => ({
  line: 2,
  mustId: "1",
  title: "S",
  year: 2020,
  status: "watched",
  rating: null,
  episodesWatched: 10,
  episodeCount: 10,
  modifiedAt: "2026-01-01T00:00:00Z",
  ...o,
});

const resolverFor = (ids: Record<string, number>) => ({
  async movie(row: MovieRow): Promise<Resolution> {
    const trakt = ids[row.title];
    return trakt
      ? { ok: true, ref: { trakt, imdb: row.imdb, title: row.title, year: row.year ?? undefined }, via: "imdb" }
      : { ok: false, reason: "none", candidates: [] };
  },
  async show(row: ShowRow): Promise<Resolution> {
    const trakt = ids[row.title];
    return trakt
      ? { ok: true, ref: { trakt, title: row.title }, via: "search" }
      : { ok: false, reason: "none", candidates: [] };
  },
});

test("buildReport buckets movies, replaces placeholder dates and keeps real ones", async () => {
  const state = emptyState({
    movieHistory: [
      { id: 10, trakt: 2, watchedAt: "2025-10-05T00:00:00Z" }, // placeholder day
      { id: 11, trakt: 3, watchedAt: "2025-01-01T00:00:00Z" }, // genuine, different
      { id: 12, trakt: 4, watchedAt: "2026-10-23T00:00:00Z" }, // within tolerance
    ],
    placeholderDays: new Set(["2025-10-05"]),
    watchedMovies: new Set([2, 3, 4]),
    movieRatings: new Map([[4, 6]]),
    movieWatchlist: new Set([8]),
  });
  const data = {
    watched: [
      movie({ title: "New", imdb: "tt1" }),
      movie({ title: "Placeholder", imdb: "tt2" }),
      movie({ title: "Real", imdb: "tt3" }),
      movie({ title: "Ok", imdb: "tt4", rating: 8 }),
      movie({ title: "Nope", imdb: "tt9" }),
    ],
    want: [
      movie({ source: "want", title: "OnList", imdb: "tt8", rating: null }),
      movie({ source: "want", title: "Add", imdb: "tt7", rating: null }),
      movie({ source: "want", title: "New", imdb: "tt1", rating: null }),
    ],
    shows: [],
  };
  const r = await buildReport(
    data,
    state,
    resolverFor({ New: 1, Placeholder: 2, Real: 3, Ok: 4, OnList: 8, Add: 7 }),
    "d",
  );

  const cat = (title: string) => r.issues.filter((i) => i.title === title).map((i) => i.category).sort();
  assert.deepEqual(cat("New"), ["missing-rating", "missing-watched"]);
  assert.deepEqual(cat("Placeholder"), ["date-missing", "missing-rating"]);
  assert.deepEqual(cat("Real"), ["date-conflict", "missing-rating"]);
  assert.deepEqual(cat("Ok"), ["rating-mismatch"]);
  assert.deepEqual(cat("Nope"), ["unresolved"]);
  assert.deepEqual(cat("Add"), ["missing-watchlist"]);
  assert.deepEqual(cat("OnList"), []);

  const replace = r.issues.find((i) => i.category === "date-missing");
  assert.deepEqual(replace?.action?.removeHistoryIds, [10]);
  assert.equal(replace?.action?.item.watched_at, "2026-10-22T12:00:00.000Z");
  // "New" is wanted too but is in the watched list, so no watchlist add.
  assert.equal(r.issues.filter((i) => i.category === "missing-watchlist").length, 1);
  assert.deepEqual(r.totals.watched, { rows: 5, ok: 0, needsAction: 4, manual: 1 });
});

test("buildReport handles shows: want, watching, watched, partial", async () => {
  const state = emptyState({
    watchedShows: new Map([
      [3, 2],
      [4, 10],
    ]),
  });
  const r = await buildReport(
    { watched: [], want: [], shows: [
      show({ title: "W", status: "want" }),
      show({ title: "Watching", status: "watching", episodesWatched: 5 }),
      show({ title: "Done", status: "watched" }),
      show({ title: "Partial", status: "watched" }),
      show({ title: "Full", status: "watched" }),
    ] },
    state,
    resolverFor({ W: 1, Watching: 2, Done: 5, Partial: 3, Full: 4 }),
    "d",
  );
  const cat = (t: string) => r.issues.filter((i) => i.title === t).map((i) => i.category);
  assert.deepEqual(cat("W"), ["missing-watchlist"]);
  assert.deepEqual(cat("Watching"), ["missing-watchlist", "show-behind"]);
  assert.deepEqual(cat("Done"), ["missing-show-watched"]);
  assert.deepEqual(cat("Partial"), ["show-partial"]);
  assert.deepEqual(cat("Full"), []);
});

test("applyReport sends each payload once, adds before removing, and refuses report-only", async () => {
  const calls: [string, any][] = [];
  const api = {
    get: async () => ({}),
    getAll: async () => [],
    post: async (p: string, b: unknown) => {
      calls.push([p, b]);
      return { added: { movies: 1 }, deleted: { movies: 1 } };
    },
  };
  const add = { ids: { trakt: 2 }, watched_at: "2026-10-22T12:00:00.000Z" };
  const action = { endpoint: "history" as const, type: "movies" as const, item: add };
  const base = { source: "watched" as const, kind: "movie" as const, title: "x", year: 1, must: "", traktValue: "" };
  const report: any = {
    issues: [
      { ...base, category: "date-missing", action: { ...action, removeHistoryIds: [10] } },
      { ...base, category: "date-missing", action: { ...action, removeHistoryIds: [10] } },
    ],
  };
  const [res] = await applyReport(api, report, ["date-missing"]);
  assert.deepEqual(calls.map((c) => c[0]), ["/sync/history", "/sync/history/remove"]);
  assert.equal(calls[0][1].movies.length, 1);
  assert.deepEqual(calls[1][1], { ids: [10] });
  assert.equal(res.removed, 1);
  await assert.rejects(applyReport(api, report, ["date-conflict"]), /report-only/);
});

test("show progress marks only the first unwatched episodes up to Must's count", async () => {
  const posts: any[] = [];
  const ep = (number: number, completed: boolean) => ({ number, completed });
  const api = {
    get: async () => ({
      seasons: [
        { number: 1, episodes: [ep(1, true), ep(2, false), ep(3, false)] },
        { number: 2, episodes: [ep(1, false), ep(2, false)] },
      ],
    }),
    getAll: async () => [],
    post: async (_p: string, b: unknown) => {
      posts.push(b);
      return { added: { episodes: 3 } };
    },
  };
  const issue = {
    category: "show-behind",
    source: "shows",
    kind: "show",
    title: "x",
    year: 1,
    must: "",
    traktValue: "",
    action: { endpoint: "progress", type: "shows", item: { ids: { trakt: 7 }, target: 4 } },
  };
  const [res] = await applyReport(api, { issues: [issue] } as any, ["show-behind"]);
  assert.deepEqual(posts[0].shows[0].seasons, [
    { number: 1, episodes: [{ number: 2, watched_at: "released" }, { number: 3, watched_at: "released" }] },
    { number: 2, episodes: [{ number: 1, watched_at: "released" }] },
  ]);
  assert.equal(res.added, 3);
});

test("fetchTraktState counts watched shows from history and never reads plays-only shows as unwatched", async () => {
  const show = (id: number) => ({ title: `S${id}`, year: 2020, ids: { trakt: id } });
  const lists: Record<string, any[]> = {
    "/sync/watched/shows": [
      { plays: 4, show: show(1) }, // no seasons in paged response, history has episodes
      { plays: 2, show: show(2) }, // plays but no countable history
    ],
    "/sync/history/shows": [
      { show: show(1), episode: { season: 1, number: 1 } },
      { show: show(1), episode: { season: 1, number: 1 } }, // replay of the same episode
      { show: show(1), episode: { season: 1, number: 2 } },
      { show: show(1), episode: { season: 0, number: 1 } }, // special
      { show: show(3), episode: { season: 1, number: 1 } }, // history only
    ],
  };
  const api = {
    get: async () => ({}),
    post: async () => ({}),
    getAll: async (p: string) => lists[p] ?? [],
  };
  const state = await fetchTraktState(api);
  assert.equal(state.watchedShows.get(1), 2);
  assert.equal(state.watchedShows.get(2), 1);
  assert.equal(state.watchedShows.get(3), 1);
  assert.equal(state.watchedShows.get(4), undefined);
});
