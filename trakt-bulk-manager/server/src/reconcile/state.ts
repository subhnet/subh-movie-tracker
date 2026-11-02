import type { TraktApi } from "./client.js";
import type { TraktRef, TraktState } from "./types.js";

const refOf = (m: any): TraktRef => ({
  trakt: m.ids.trakt,
  imdb: m.ids.imdb || undefined,
  tmdb: m.ids.tmdb || undefined,
  title: m.title,
  year: m.year ?? undefined,
});

// A day with this many movie watches is a bulk import, not real viewing.
export const PLACEHOLDER_DAY_MIN = 25;

export async function fetchTraktState(
  api: TraktApi,
  log: (m: string) => void = () => {},
): Promise<TraktState> {
  const paths = {
    history: "/sync/history/movies",
    showHistory: "/sync/history/shows",
    watchedMovies: "/sync/watched/movies",
    watchedShows: "/sync/watched/shows",
    movieRatings: "/sync/ratings/movies",
    showRatings: "/sync/ratings/shows",
    movieWatchlist: "/sync/watchlist/movies",
    showWatchlist: "/sync/watchlist/shows",
  } as const;
  const raw: Record<string, any[]> = {};
  for (const [key, p] of Object.entries(paths)) {
    log(`Fetching ${p}`);
    raw[key] = await api.getAll(p);
  }

  const movieByImdb = new Map<string, TraktRef>();
  const remember = (m: any) => {
    if (m?.ids?.imdb && m.ids.trakt) movieByImdb.set(m.ids.imdb, refOf(m));
  };
  [raw.history, raw.watchedMovies, raw.movieRatings, raw.movieWatchlist].forEach((list) =>
    list.forEach((x) => remember(x.movie)),
  );

  // The paged /sync/watched/shows has no per-episode data, so distinct episodes come from history.
  // A show with plays but no countable episodes still counts as started, never as unwatched.
  const episodes = new Map<number, Set<string>>();
  for (const x of raw.showHistory) {
    if (!x.episode || x.episode.season <= 0) continue;
    const set = episodes.get(x.show.ids.trakt) ?? new Set<string>();
    set.add(`${x.episode.season}x${x.episode.number}`);
    episodes.set(x.show.ids.trakt, set);
  }
  const watchedShows = new Map<number, number>();
  for (const x of raw.watchedShows) {
    const id = x.show.ids.trakt;
    watchedShows.set(id, Math.max(episodes.get(id)?.size ?? 0, x.plays > 0 ? 1 : 0));
  }
  for (const [id, set] of episodes) {
    if (!watchedShows.has(id)) watchedShows.set(id, set.size);
  }

  const perDay = new Map<string, number>();
  for (const x of raw.history) {
    const day = String(x.watched_at).slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const placeholderDays = new Set(
    [...perDay].filter(([, n]) => n >= PLACEHOLDER_DAY_MIN).map(([d]) => d),
  );

  return {
    movieHistory: raw.history.map((x) => ({ id: x.id, trakt: x.movie.ids.trakt, watchedAt: x.watched_at })),
    placeholderDays,
    watchedMovies: new Set([
      ...raw.watchedMovies.map((x) => x.movie.ids.trakt),
      ...raw.history.map((x) => x.movie.ids.trakt),
    ]),
    watchedShows,
    movieRatings: new Map(raw.movieRatings.map((x) => [x.movie.ids.trakt, x.rating])),
    showRatings: new Map(raw.showRatings.map((x) => [x.show.ids.trakt, x.rating])),
    movieWatchlist: new Set(raw.movieWatchlist.map((x) => x.movie.ids.trakt)),
    showWatchlist: new Set(raw.showWatchlist.map((x) => x.show.ids.trakt)),
    movieByImdb,
    raw,
  };
}
