export interface Movie {
  title: string;
  rating: string;
  watchedDate: string;
  scrapedDate: string;
  notes: string;
  tags: string;
  rewatched: string;
  poster_url?: string | null;
  overview?: string | null;
}

export interface MovieStats {
  total: number;
  rated: number;
  avgRating: number;
  distribution: Record<number, number>;
}

export interface DashboardData {
  watched: Movie[];
  wants: Movie[];
  shows: Movie[];
  watchedStats: MovieStats;
  wantsStats: MovieStats;
  showsStats: MovieStats;
}

export interface Recommendation {
  title: string;
  reason: string;
  confidence: number;
  genres?: string[];
  rating?: number;
}

