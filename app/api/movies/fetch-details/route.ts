import { NextResponse } from 'next/server'

interface TMDBMovie {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  overview: string
  vote_average: number
}

interface TMDBSearchResponse {
  results: TMDBMovie[]
}

interface OMDbSearchResponse {
  Search?: Array<{
    Title: string
    Year: string
    imdbID: string
    Type: string
    Poster: string
  }>
  Response: string
}

interface OMDbDetailResponse {
  Title: string
  Year: string
  Plot: string
  Poster: string
  imdbRating: string
  Type: string
  Actors: string
  Response: string
}

// API endpoints
const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const OMDB_API_BASE = 'https://www.omdbapi.com'

/**
 * Fetch movie details from TMDB
 */
async function fetchFromTMDB(title: string, type: string, apiKey: string) {
  const mediaType = type === 'show' ? 'tv' : 'movie'
  const endpoint = mediaType === 'tv' ? 'search/tv' : 'search/movie'
  const url = `${TMDB_API_BASE}/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(title)}&page=1`

  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error('Failed to fetch from TMDB')
  }

  const data: TMDBSearchResponse = await response.json()

  if (!data.results || data.results.length === 0) {
    return null
  }

  const movie = data.results[0]

  // Fetch cast information
  let cast: string[] = []
  try {
    const creditsUrl = `${TMDB_API_BASE}/${mediaType}/${movie.id}/credits?api_key=${apiKey}`
    const creditsResponse = await fetch(creditsUrl)
    if (creditsResponse.ok) {
      const creditsData = await creditsResponse.json()
      // Get top 5 cast members
      cast = creditsData.cast
        ?.slice(0, 5)
        .map((actor: any) => actor.name) || []
    }
  } catch (error) {
    console.error('Failed to fetch TMDB cast:', error)
  }

  const dateString = movie.release_date || movie.first_air_date
  
  return {
    id: movie.id,
    title: movie.title || movie.name,
    overview: movie.overview || '',
    poster: movie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
      : null,
    rating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
    year: dateString ? new Date(dateString).getFullYear() : null,
    cast,
    source: 'tmdb'
  }
}

/**
 * Fetch movie details from OMDb
 */
async function fetchFromOMDb(title: string, type: string, apiKey: string) {
  const omdbType = type === 'show' ? 'series' : 'movie'
  
  // First, search to get the IMDb ID
  const searchUrl = `${OMDB_API_BASE}/?apikey=${apiKey}&s=${encodeURIComponent(title)}&type=${omdbType}`
  const searchResponse = await fetch(searchUrl)
  
  if (!searchResponse.ok) {
    throw new Error('Failed to search OMDb')
  }

  const searchData: OMDbSearchResponse = await searchResponse.json()

  if (searchData.Response === 'False' || !searchData.Search || searchData.Search.length === 0) {
    return null
  }

  // Get detailed info for the first result
  const firstResult = searchData.Search[0]
  const detailUrl = `${OMDB_API_BASE}/?apikey=${apiKey}&i=${firstResult.imdbID}&plot=full`
  const detailResponse = await fetch(detailUrl)
  
  if (!detailResponse.ok) {
    throw new Error('Failed to fetch OMDb details')
  }

  const detail: OMDbDetailResponse = await detailResponse.json()

  if (detail.Response === 'False') {
    return null
  }

  // Parse cast from OMDb (comma-separated string)
  const cast = detail.Actors && detail.Actors !== 'N/A' 
    ? detail.Actors.split(',').map(name => name.trim()).slice(0, 5)
    : []

  return {
    id: firstResult.imdbID,
    title: detail.Title,
    overview: detail.Plot !== 'N/A' ? detail.Plot : '',
    poster: detail.Poster !== 'N/A' ? detail.Poster : null,
    rating: detail.imdbRating !== 'N/A' ? parseFloat(detail.imdbRating).toFixed(1) : null,
    year: detail.Year ? parseInt(detail.Year) : null,
    cast,
    source: 'omdb'
  }
}

/**
 * Fetch movie/TV show details by title
 * Supports both TMDB and OMDb APIs with automatic fallback
 * Used to get overview and other metadata for existing movies
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    const type = searchParams.get('type') || 'watched' // watched, want, show

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const tmdbApiKey = process.env.TMDB_API_KEY
    const omdbApiKey = process.env.OMDB_API_KEY

    let result = null
    let source = 'none'

    // Try TMDB first, then fall back to OMDb
    if (tmdbApiKey) {
      try {
        console.log(`[TMDB API] Fetching details for: "${title}" (type: ${type})`)
        result = await fetchFromTMDB(title, type, tmdbApiKey)
        if (result) {
          source = 'tmdb'
        }
      } catch (error) {
        console.error('TMDB fetch failed:', error)
      }
    }

    // Fallback to OMDb if TMDB failed or no API key
    if (!result && omdbApiKey) {
      try {
        console.log(`[OMDb API] Fetching details for: "${title}" (type: ${type})`)
        result = await fetchFromOMDb(title, type, omdbApiKey)
        if (result) {
          source = 'omdb'
        }
      } catch (error) {
        console.error('OMDb fetch failed:', error)
      }
    }

    // No API keys configured
    if (!tmdbApiKey && !omdbApiKey) {
      console.warn('No movie API key configured (TMDB_API_KEY or OMDB_API_KEY)')
      return NextResponse.json({
        found: false,
        error: 'Movie API not configured. Please add TMDB_API_KEY or OMDB_API_KEY to environment variables.'
      })
    }

    // No results found
    if (!result) {
      return NextResponse.json({
        found: false,
        message: 'No results found',
        source
      })
    }

    return NextResponse.json({
      found: true,
      data: result,
      source
    })
  } catch (error) {
    console.error('Fetch movie details error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movie details', found: false },
      { status: 500 }
    )
  }
}

