export type TraktRef = {
  trakt: number;
  imdb?: string;
  tmdb?: number;
  title: string;
  year?: number;
};

export type MovieRow = {
  source: "watched" | "want";
  line: number;
  imdb: string;
  title: string;
  year: number | null;
  rating: number | null;
  date: string;
};

export type ShowRow = {
  line: number;
  mustId: string;
  title: string;
  year: number | null;
  status: "want" | "watching" | "watched";
  rating: number | null;
  episodesWatched: number;
  episodeCount: number;
  modifiedAt: string;
};

export type ExportData = {
  watched: MovieRow[];
  want: MovieRow[];
  shows: ShowRow[];
};

export type Resolution =
  | { ok: true; ref: TraktRef; via: string }
  | { ok: false; reason: string; candidates: string[] };

export type TraktState = {
  movieHistory: { id: number; trakt: number; watchedAt: string }[];
  placeholderDays: Set<string>; // days with a bulk-import-sized pile of watches
  watchedMovies: Set<number>;
  watchedShows: Map<number, number>; // trakt id -> watched episode count
  movieRatings: Map<number, number>;
  showRatings: Map<number, number>;
  movieWatchlist: Set<number>;
  showWatchlist: Set<number>;
  movieByImdb: Map<string, TraktRef>;
  raw: Record<string, unknown>;
};

export const CATEGORIES = [
  "missing-watched",
  "date-missing",
  "date-conflict",
  "missing-rating",
  "rating-mismatch",
  "missing-watchlist",
  "missing-show-watched",
  "show-partial",
  "show-behind",
  "unresolved",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const APPLICABLE: Category[] = [
  "missing-watched",
  "date-missing",
  "missing-rating",
  "rating-mismatch",
  "missing-watchlist",
  "missing-show-watched",
  "show-partial",
  "show-behind",
];

export type Action = {
  // "progress" is resolved at apply time: item = { ids, target } where target is Must's watched-episode count.
  endpoint: "history" | "ratings" | "watchlist" | "progress";
  type: "movies" | "shows";
  item: Record<string, unknown>;
  removeHistoryIds?: number[];
};

export type Issue = {
  category: Category;
  source: "watched" | "want" | "shows";
  kind: "movie" | "show";
  title: string;
  year: number | null;
  imdb?: string;
  trakt?: number;
  must: string;
  traktValue: string;
  note?: string;
  action?: Action;
};

export type SourceTotals = {
  rows: number;
  ok: number;
  needsAction: number;
  manual: number;
};

export type Report = {
  generatedAt: string;
  dir: string;
  totals: Record<"watched" | "want" | "shows", SourceTotals>;
  counts: Record<Category, number>;
  traktOnly: { watchedMovies: number; watchlistMovies: number; ratedMovies: number };
  issues: Issue[];
};
