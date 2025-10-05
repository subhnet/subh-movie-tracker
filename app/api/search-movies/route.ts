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

// TMDB API endpoint
const TMDB_API_BASE = 'https://api.themoviedb.org/3'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const type = searchParams.get('type') || 'movie' // 'movie' or 'tv'

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    const tmdbApiKey = process.env.TMDB_API_KEY

    // If no API key, return empty results (graceful degradation)
    if (!tmdbApiKey) {
      console.warn('TMDB_API_KEY not configured')
      return NextResponse.json({ 
        results: [],
        message: 'Movie search not configured. Please add TMDB_API_KEY to environment variables.'
      })
    }

    // Determine endpoint based on type
    const endpoint = type === 'tv' ? 'search/tv' : 'search/movie'
    const url = `${TMDB_API_BASE}/${endpoint}?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Failed to fetch from TMDB')
    }

    const data: TMDBSearchResponse = await response.json()

    // Format results for our UI
    const formattedResults = data.results.slice(0, 8).map((item: any) => ({
      id: item.id,
      title: item.title || item.name, // 'name' for TV shows
      year: item.release_date || item.first_air_date 
        ? new Date(item.release_date || item.first_air_date).getFullYear() 
        : null,
      // Use w185 for search suggestions (small), provide w500 for full view
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
      rating: item.vote_average ? (item.vote_average / 2).toFixed(1) : null, // Convert 10-point to 5-point scale
      mediaType: type
    }))

    return NextResponse.json({ 
      results: formattedResults,
      source: 'tmdb'
    })
  } catch (error) {
    console.error('Movie search error:', error)
    return NextResponse.json(
      { error: 'Failed to search movies', results: [] },
      { status: 500 }
    )
  }
}

