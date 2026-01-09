// Server-side data fetching utilities
import { supabase } from './supabase'

interface Movie {
  id: string
  title: string
  rating: string
  tags: string
  type: string
  credits?: {
    cast: Array<{ name: string; profile_path?: string | null }>
    crew: Array<{ name: string; job: string; profile_path?: string | null }>
  }
}

interface PersonStat {
  name: string
  count: number
  profile_path?: string | null
}

interface Stats {
  total: number
  rated: number
  avgRating: number
  distribution: Record<number, number>
  topActors: PersonStat[]
  topDirectors: PersonStat[]
}

export interface DashboardData {
  watched: Movie[]
  wants: Movie[]
  shows: Movie[]
  watchedStats: Stats
  wantsStats: Stats
  showsStats: Stats
}

interface StatsAccumulator {
  total: number
  ratedCount: number
  ratingSum: number
  distribution: Record<number, number>
  actorMap: Map<string, PersonStat>
  directorMap: Map<string, PersonStat>
}

function createStatsAccumulator(): StatsAccumulator {
  return {
    total: 0,
    ratedCount: 0,
    ratingSum: 0,
    distribution: {},
    actorMap: new Map(),
    directorMap: new Map()
  }
}

function updateStatsAccumulator(acc: StatsAccumulator, movie: Partial<Movie>) {
  acc.total++

  if (movie.rating && parseFloat(movie.rating) > 0) {
    const ratingVal = parseFloat(movie.rating)
    acc.ratedCount++
    acc.ratingSum += ratingVal

    const ratingFloor = Math.floor(ratingVal)
    acc.distribution[ratingFloor] = (acc.distribution[ratingFloor] || 0) + 1
  }

  if (movie.credits) {
    if (movie.credits.cast) {
      movie.credits.cast.forEach(actor => {
        const current = acc.actorMap.get(actor.name)
        if (current) {
          current.count++
        } else {
          acc.actorMap.set(actor.name, { name: actor.name, count: 1, profile_path: actor.profile_path })
        }
      })
    }
    if (movie.credits.crew) {
      movie.credits.crew.forEach(crew => {
        if (crew.job === 'Director') {
          const current = acc.directorMap.get(crew.name)
          if (current) {
            current.count++
          } else {
            acc.directorMap.set(crew.name, { name: crew.name, count: 1, profile_path: crew.profile_path })
          }
        }
      })
    }
  }
}

function finalizeStats(acc: StatsAccumulator): Stats {
  const topActors = Array.from(acc.actorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const topDirectors = Array.from(acc.directorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const avgRating = acc.ratedCount > 0 ? acc.ratingSum / acc.ratedCount : 0

  return {
    total: acc.total,
    rated: acc.ratedCount,
    avgRating,
    distribution: acc.distribution,
    topActors,
    topDirectors
  }
}

// Keep original function for compatibility but implement using accumulators
function calculateStats(movies: Movie[]): Stats {
  const acc = createStatsAccumulator()
  movies.forEach(m => updateStatsAccumulator(acc, m))
  return finalizeStats(acc)
}

/**
 * Fetch all movies for a user from the database
 * Optimized to prevent timeouts by fetching lightweight list separately from heavy stats data
 */
export async function fetchUserMovies(userId: string): Promise<DashboardData> {
  // 1. Fetch lightweight movie list (minimal columns) for Dashboard
  // Dashboard only needs title, rating, type (and tags for type checking)
  const { data: movies, error } = await supabase
    .from('movies')
    // Include tags because it's required by the Movie interface
    // Include poster_url because it's needed for the Analytics dashboard (Top Rated sections)
    .select('id, title, rating, tags, type, created_at, user_id, poster_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Database error fetching movie list:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to fetch movies: ${error.message || 'Unknown error'}`)
  }

  const watched = movies?.filter(m => m.type === 'watched') || []
  const wants = movies?.filter(m => m.type === 'want') || []
  const shows = movies?.filter(m => m.type === 'show') || []

  // 2. Calculate stats by fetching heavy data (credits) in chunks
  // to avoid statement timeout
  const statsAcc = {
    watched: createStatsAccumulator(),
    want: createStatsAccumulator(),
    show: createStatsAccumulator()
  }

  try {
    const CHUNK_SIZE = 50
    // Get total count first
    const { count } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const totalMovies = count || 0

    // Fetch in chunks
    for (let i = 0; i < totalMovies; i += CHUNK_SIZE) {
      const { data: chunk, error: chunkError } = await supabase
        .from('movies')
        .select('type, rating, credits')
        .eq('user_id', userId)
        .range(i, i + CHUNK_SIZE - 1)

      if (chunkError) {
        console.error('Error fetching stats chunk:', chunkError)
        // Continue with partial stats rather than failing completely
        continue
      }

      if (chunk) {
        chunk.forEach((m: any) => {
          // @ts-ignore
          if (statsAcc[m.type]) {
            // @ts-ignore
            updateStatsAccumulator(statsAcc[m.type], m)
          }
        })
      }
    }
  } catch (err) {
    console.error('Error calculating dashboard stats:', err)
    // Fallback: return empty stats if calculation fails, but at least show the list
  }

  return {
    watched, // These are lightweight movies (missing credits), but modals will fetch details on demand
    wants,
    shows,
    watchedStats: finalizeStats(statsAcc.watched),
    wantsStats: finalizeStats(statsAcc.want),
    showsStats: finalizeStats(statsAcc.show),
  }
}

/**
 * Fetch all movies (combined) for a user
 */
export async function fetchAllUserMovies(userId: string): Promise<Movie[]> {
  const { data: movies, error } = await supabase
    .from('movies')
    // Exclude overview to save bandwidth (lazy loaded in modals)
    // Include providers because ClientMovieManager filters by it
    .select('id, title, rating, tags, type, created_at, user_id, poster_url, providers')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Database error fetching all movies:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to fetch movies: ${error.message || 'Unknown error'}`)
  }


  return movies || []
}


