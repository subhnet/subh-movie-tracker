import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDashboardData } from '@/lib/csv-reader'
import { supabase } from '@/lib/supabase'
import { rateLimitAI } from '@/lib/rate-limit'
import { getAIProvider } from '@/lib/ai-service'

// Movie type definition
interface Movie {
  title: string
  rating: string
  tags?: string
  [key: string]: any
}

// Validation schema
const recommendRequestSchema = z.object({
  type: z.enum(['general', 'watchlist']).default('general'),
  userId: z.string().uuid().optional()
})

export async function POST(request: Request) {
  try {
    // Rate limiting - 5 AI requests per 10 seconds
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    const rateLimitResult = await rateLimitAI(ip)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait before requesting more recommendations.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset)
          }
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = recommendRequestSchema.parse(body)
    const { type = 'general', userId } = validatedData

    // Get user's movie data (from database if userId provided, otherwise CSV)
    let data: { watched: Movie[], wants: Movie[], shows: Movie[] }
    if (userId) {
      // Fetch directly from Supabase instead of making HTTP call
      const { data: movies, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user movies:', error)
        throw new Error('Failed to fetch user movies')
      }

      // Group movies by type
      const watched = movies?.filter((m: any) => m.type === 'watched') || []
      const wants = movies?.filter((m: any) => m.type === 'want') || []
      const shows = movies?.filter((m: any) => m.type === 'show') || []

      data = { watched, wants, shows }
    } else {
      const csvData = await getDashboardData()
      data = {
        watched: csvData.watched,
        wants: csvData.wants,
        shows: csvData.shows
      }
    }

    // Get top rated movies for context (10/10 ratings)
    const perfectRated = data.watched
      .filter((m: Movie) => parseFloat(m.rating) === 10)
      .sort((a: Movie, b: Movie) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 20)
      .map((m: Movie) => m.title)
      .join(', ')

    // Get highly rated movies (9-10 stars)
    const highlyRated = data.watched
      .filter((m: Movie) => parseFloat(m.rating) >= 9)
      .sort((a: Movie, b: Movie) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 30)
      .map((m: Movie) => `${m.title} (${m.rating}★)`)
      .join(', ')

    // Get good movies (8+ stars) for additional context
    const goodMovies = data.watched
      .filter((m: Movie) => parseFloat(m.rating) >= 8 && parseFloat(m.rating) < 9)
      .slice(0, 20)
      .map((m: Movie) => m.title)
      .join(', ')

    // Get movies they didn't like (below 6) to understand what to avoid
    const dislikedMovies = data.watched
      .filter((m: Movie) => parseFloat(m.rating) > 0 && parseFloat(m.rating) < 6)
      .slice(0, 15)
      .map((m: Movie) => `${m.title} (${m.rating}★)`)
      .join(', ')

    // Extract genre/tag preferences from top-rated movies
    const topRatedTags = data.watched
      .filter((m: Movie) => parseFloat(m.rating) >= 9 && m.tags)
      .flatMap((m: Movie) => m.tags!.split(';').map((t: string) => t.trim()))
      .filter((t: string) => t.length > 0)

    // Count tag frequency
    const tagCounts: Record<string, number> = {}
    topRatedTags.forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })

    // Get top genres/tags
    const topGenres = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => `${tag} (${count} movies)`)
      .join(', ')

    // Get all watched movies and shows to exclude from recommendations
    const allWatchedTitles = [
      ...data.watched.map((m: Movie) => m.title),
      ...data.shows.map((m: Movie) => m.title)
    ]

    // Create a smart sample: include highly rated movies and a broad selection
    // to give AI good context of what's already watched
    const highRatedWatched = data.watched
      .filter((m: Movie) => parseFloat(m.rating) >= 7)
      .map((m: Movie) => m.title)

    const allShows = data.shows.map((m: Movie) => m.title)

    // Combine and take a large sample (300 titles should fit in token limit)
    const watchedSample = [
      ...highRatedWatched.slice(0, 200),
      ...allShows,
      ...allWatchedTitles.filter((t: string) => !highRatedWatched.includes(t) && !allShows.includes(t)).slice(0, 50)
    ].slice(0, 300).join(', ')

    const watchlist = data.wants
      .slice(0, 10)
      .map((m: Movie) => m.title)
      .join(', ')

    // Create prompt based on type
    let prompt = ''

    if (type === 'watchlist') {
      prompt = `My watchlist contains: ${watchlist}
      
      Based on my high ratings (9-10/10) for: ${highlyRated}
      
      Which 5 movies from my watchlist should I prioritize?
      For each, explain the connection to my favorites.
      
      Return JSON: { "recommendations": [{ "title": "Movie", "reason": "Connection explanation", "confidence": 90 }] }`
    } else {
      // Calculate stats on the fly
      const watchedRatings = data.watched.filter((m: Movie) => parseFloat(m.rating) > 0)
      const avgRating = watchedRatings.length > 0
        ? watchedRatings.reduce((sum, m) => sum + parseFloat(m.rating), 0) / watchedRatings.length
        : 0

      prompt = `Analyze my cinematic taste profile and recommend 5 NEW movies.

PROFILE:
- Avg Rating: ${avgRating.toFixed(1)}/10
- Favorites (9-10★): ${highlyRated}
- Liked (8★): ${goodMovies}
- Top Themes: ${topGenres}
${dislikedMovies ? `- Disliked: ${dislikedMovies}` : ''}

AVOID (Already Seen):
${watchedSample}

INSTRUCTIONS:
1. Be a "Film Curator". Don't just pick popular hits. Look for shared directors, writers, cinematographers, or atmospheric matches.
2. Provide a "Curator's Note" for each, explaining the specific connection to my taste (e.g., "If you loved Inception for its dream logic, you must see Paprika").
3. Ensure high diversity (mix of eras/languages if appropriate).
4. Strictly NO movies from the "AVOID" list.

Return JSON object:
{
  "recommendations": [
    {
      "title": "Exact Title (Year)",
      "reason": "Curator's note on why this specific film matches my taste",
      "confidence": 85, 
      "genres": ["Genre1", "Genre2"]
    }
  ]
}`
    }

    // Call AI Provider (Gemini or OpenRouter logic)
    const systemPrompt = 'You are CineMate, an elite film curator with encyclopedic knowledge of cinema history, directors, and screenwriting. Your recommendations are insightful, personalized, and go beyond surface-level genre matches. You speak eloquently but concisely.'

    try {
      const provider = getAIProvider()
      const recommendationsResponse = await provider.generateResponse(systemPrompt, prompt)

      // Parse recommendations
      let recommendations = recommendationsResponse

      // Handle raw array or nested object formats
      if (typeof recommendations === 'string') {
        try {
          recommendations = JSON.parse(recommendations)
        } catch (e) {
          // ignore parsing error if it's already an object
        }
      }

      // Normalize response structure
      if (Array.isArray(recommendations)) {
        // perfect
      } else if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
        recommendations = recommendations.recommendations
      } else if (recommendations.movies && Array.isArray(recommendations.movies)) {
        recommendations = recommendations.movies
      } else if (typeof recommendations === 'object') {
        recommendations = [recommendations]
      } else {
        console.error('Unexpected recommendations format:', recommendations)
        throw new Error('AI returned unexpected format')
      }

      // Filter out already watched
      const watchedTitlesLower = allWatchedTitles.map(t => t.toLowerCase().trim())
      recommendations = recommendations.filter((rec: any) => {
        if (!rec || !rec.title) return false
        const recTitle = rec.title.toLowerCase().trim()
        return !watchedTitlesLower.includes(recTitle)
      })

      return NextResponse.json({ recommendations })

    } catch (aiError: any) {
      console.error('AI Provider Error:', aiError)

      // Specialized error messaging
      if (aiError.message.includes('GEMINI_API_KEY is missing')) {
        return NextResponse.json(
          { error: 'Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.' },
          { status: 500 }
        )
      }
      if (aiError.message.includes('OPENROUTER_API_KEY is missing')) {
        return NextResponse.json(
          { error: 'OpenRouter API Key is missing. Please add a key or switch AI_PROVIDER to gemini.' },
          { status: 500 }
        )
      }

      throw aiError // Re-throw to be caught by outer catch
    }

  } catch (error: any) {
    console.error('Error in recommend route:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: `API Error: ${error.message || 'Failed to generate recommendations'}` },
      { status: 500 }
    )
  }
}
