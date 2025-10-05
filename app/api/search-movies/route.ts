import { NextResponse } from 'next/server'

interface TMDBMovie {
  id: number
  title: string
  release_date: string
  poster_path: string | null
  overview: string
  vote_average: number
}

interface TMDBSearchResponse {
  results: TMDBMovie[]
}

interface OMDbMovie {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
}

interface OMDbSearchResponse {
  Search: OMDbMovie[]
  totalResults: string
  Response: string
}

// API endpoints
const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const OMDB_API_BASE = 'https://www.omdbapi.com'

async function searchWithTMDB(query: string, type: string, apiKey: string) {
  const endpoint = type === 'tv' ? 'search/tv' : 'search/movie'
  const url = `${TMDB_API_BASE}/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`

  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error('Failed to fetch from TMDB')
  }

  const data: TMDBSearchResponse = await response.json()

  return data.results.slice(0, 8).map((item: any) => ({
    id: item.id,
    title: item.title || item.name,
    year: item.release_date || item.first_air_date 
      ? new Date(item.release_date || item.first_air_date).getFullYear() 
      : null,
    posterSmall: item.poster_path 
      ? `https://image.tmdb.org/t/p/w92${item.poster_path}` 
      : null,
    poster: item.poster_path 
      ? `https://image.tmdb.org/t/p/w185${item.poster_path}` 
      : null,
    posterLarge: item.poster_path 
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
      : null,
    overview: item.overview,
    rating: item.vote_average ? (item.vote_average / 2).toFixed(1) : null,
    mediaType: type
  }))
}

async function searchWithOMDb(query: string, type: string, apiKey: string) {
  // OMDb type: movie, series, episode
  const omdbType = type === 'tv' ? 'series' : 'movie'
  const url = `${OMDB_API_BASE}/?apikey=${apiKey}&s=${encodeURIComponent(query)}&type=${omdbType}`

  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error('Failed to fetch from OMDb')
  }

  const data: OMDbSearchResponse = await response.json()

  if (data.Response === 'False' || !data.Search) {
    return []
  }

  // Get detailed info for rating (OMDb search doesn't include ratings)
  const detailedResults = await Promise.all(
    data.Search.slice(0, 8).map(async (item) => {
      try {
        const detailUrl = `${OMDB_API_BASE}/?apikey=${apiKey}&i=${item.imdbID}`
        const detailResponse = await fetch(detailUrl)
        const detail = await detailResponse.json()
        
        return {
          id: item.imdbID,
          title: item.Title,
          year: item.Year ? parseInt(item.Year) : null,
          posterSmall: item.Poster !== 'N/A' ? item.Poster : null,
          poster: item.Poster !== 'N/A' ? item.Poster : null,
          posterLarge: item.Poster !== 'N/A' ? item.Poster : null,
          overview: detail.Plot !== 'N/A' ? detail.Plot : '',
          rating: detail.imdbRating !== 'N/A' ? (parseFloat(detail.imdbRating) / 2).toFixed(1) : null,
          mediaType: type
        }
      } catch (error) {
        // If detail fetch fails, return basic info
        return {
          id: item.imdbID,
          title: item.Title,
          year: item.Year ? parseInt(item.Year) : null,
          posterSmall: item.Poster !== 'N/A' ? item.Poster : null,
          poster: item.Poster !== 'N/A' ? item.Poster : null,
          posterLarge: item.Poster !== 'N/A' ? item.Poster : null,
          overview: '',
          rating: null,
          mediaType: type
        }
      }
    })
  )

  return detailedResults
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const type = searchParams.get('type') || 'movie' // 'movie' or 'tv'

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    const tmdbApiKey = process.env.TMDB_API_KEY
    const omdbApiKey = process.env.OMDB_API_KEY

    let results = []
    let source = 'none'

    // Try TMDB first, then fall back to OMDb
    if (tmdbApiKey) {
      try {
        console.log(`[TMDB API] Search query: "${query}" (type: ${type})`)
        results = await searchWithTMDB(query, type, tmdbApiKey)
        source = 'tmdb'
      } catch (error) {
        console.error('TMDB search failed:', error)
        if (omdbApiKey) {
          console.log(`[OMDb API] Fallback search: "${query}" (type: ${type})`)
          results = await searchWithOMDb(query, type, omdbApiKey)
          source = 'omdb'
        }
      }
    } else if (omdbApiKey) {
      console.log(`[OMDb API] Search query: "${query}" (type: ${type})`)
      results = await searchWithOMDb(query, type, omdbApiKey)
      source = 'omdb'
    } else {
      console.warn('No movie API key configured (TMDB_API_KEY or OMDB_API_KEY)')
      return NextResponse.json({ 
        results: [],
        message: 'Movie search not configured. Please add TMDB_API_KEY or OMDB_API_KEY to environment variables.'
      })
    }

    return NextResponse.json({ 
      results,
      source
    })
  } catch (error) {
    console.error('Movie search error:', error)
    return NextResponse.json(
      { error: 'Failed to search movies', results: [] },
      { status: 500 }
    )
  }
}

