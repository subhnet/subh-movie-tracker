// Server-side data fetching utilities
import { supabase } from './supabase'

interface Movie {
  id: string
  title: string
  rating: string
  tags: string
  type: string
  poster_url?: string | null
  overview?: string | null
  created_at?: string
}

interface Stats {
  total: number
  rated: number
  avgRating: number
  distribution: Record<number, number>
}

export interface DashboardData {
  watched: Movie[]
  wants: Movie[]
  shows: Movie[]
  watchedStats: Stats
  wantsStats: Stats
  showsStats: Stats
}

function calculateStats(movies: Movie[]): Stats {
  const rated = movies.filter(m => m.rating && parseFloat(m.rating) > 0)
  const distribution: Record<number, number> = {}
  
  rated.forEach(movie => {
    const rating = Math.floor(parseFloat(movie.rating))
    distribution[rating] = (distribution[rating] || 0) + 1
  })

  const avgRating = rated.length > 0
    ? rated.reduce((sum, m) => sum + parseFloat(m.rating), 0) / rated.length
    : 0

  return {
    total: movies.length,
    rated: rated.length,
    avgRating,
    distribution
  }
}

/**
 * Fetch all movies for a user from the database
 * This runs on the server and is optimized for Server Components
 */
export async function fetchUserMovies(userId: string): Promise<DashboardData> {
  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Database error:', error)
    throw new Error('Failed to fetch movies')
  }

  const watched = movies?.filter(m => m.type === 'watched') || []
  const wants = movies?.filter(m => m.type === 'want') || []
  const shows = movies?.filter(m => m.type === 'show') || []

  return {
    watched,
    wants,
    shows,
    watchedStats: calculateStats(watched),
    wantsStats: calculateStats(wants),
    showsStats: calculateStats(shows),
  }
}

/**
 * Fetch all movies (combined) for a user
 */
export async function fetchAllUserMovies(userId: string): Promise<Movie[]> {
  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Database error:', error)
    throw new Error('Failed to fetch movies')
  }

  return movies || []
}


