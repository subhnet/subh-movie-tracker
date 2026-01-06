import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { getDashboardData } from '@/lib/csv-reader'
import { supabase } from '@/lib/supabase'
import { rateLimitAI } from '@/lib/rate-limit'

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

// Configure OpenRouter using OpenAI SDK
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.OPENROUTER_APP_URL || 'http://localhost:3000',
    'X-Title': process.env.OPENROUTER_APP_NAME || 'Movie Tracker',
  },
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

    // Call OpenRouter (Using Google Gemini 2.0 Flash - Free & Powerful)
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [
        {
          role: 'system',
          content: 'You are CineMate, an elite film curator with encyclopedic knowledge of cinema history, directors, and screenwriting. Your recommendations are insightful, personalized, and go beyond surface-level genre matches. You speak eloquently but concisely.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8, // Slightly higher for more creative/diverse picks
      max_tokens: 3000,
      response_format: { type: 'json_object' } as any,
    })

    const content = response.choices[0]?.message?.content || '{}'

    console.log('OpenRouter response:', content)

    // Parse recommendations
    let recommendations
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonContent = content.trim()
      if (jsonContent.includes('```json')) {
        jsonContent = jsonContent.split('```json')[1].split('```')[0].trim()
      } else if (jsonContent.includes('```')) {
        jsonContent = jsonContent.split('```')[1].split('```')[0].trim()
      }

      const parsed = JSON.parse(jsonContent)

      // Handle different response formats
      if (Array.isArray(parsed)) {
        recommendations = parsed
      } else if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        recommendations = parsed.recommendations
      } else if (parsed.movies && Array.isArray(parsed.movies)) {
        recommendations = parsed.movies
      } else if (typeof parsed === 'object') {
        // If it's a single object, wrap it in an array
        recommendations = [parsed]
      } else {
        throw new Error('Unexpected response format')
      }

      // Filter out any recommendations that are already watched (case-insensitive match)
      const watchedTitlesLower = allWatchedTitles.map(t => t.toLowerCase().trim())
      const filteredRecommendations = recommendations.filter((rec: any) => {
        const recTitle = rec.title.toLowerCase().trim()
        return !watchedTitlesLower.includes(recTitle)
      })

      // Log if any were filtered out
      if (filteredRecommendations.length < recommendations.length) {
        console.log(`Filtered out ${recommendations.length - filteredRecommendations.length} already-watched movies`)
        const filtered = recommendations.filter((rec: any) => {
          const recTitle = rec.title.toLowerCase().trim()
          return watchedTitlesLower.includes(recTitle)
        })
        console.log('Filtered titles:', filtered.map((r: any) => r.title))
      }

      recommendations = filteredRecommendations

    } catch (parseError: any) {
      console.error('JSON parsing error:', parseError.message)
      console.error('Raw content:', content)

      // Return error with the actual parsing issue
      return NextResponse.json(
        {
          error: 'Failed to parse AI response. The model returned invalid JSON.',
          recommendations: [],
          debug: { content: content.substring(0, 500) }
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ recommendations })

  } catch (error: any) {
    console.error('Error generating recommendations:', error)

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`),
          recommendations: []
        },
        { status: 400 }
      )
    }

    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    })

    // Provide helpful error messages
    if (error.code === 'insufficient_quota' || error.status === 402) {
      return NextResponse.json(
        {
          error: 'OpenRouter API quota exceeded. Please add credits to your OpenRouter account.',
          recommendations: []
        },
        { status: 402 }
      )
    }

    if (error.status === 401 || error.message?.includes('401')) {
      return NextResponse.json(
        {
          error: 'Invalid OpenRouter API key. Please check your API key in .env.local',
          recommendations: []
        },
        { status: 401 }
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        {
          error: 'OpenRouter API key not configured. Add OPENROUTER_API_KEY to .env.local',
          recommendations: []
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: `API Error: ${error.message || 'Failed to generate recommendations'}`,
        recommendations: [],
        debug: { status: error.status, code: error.code }
      },
      { status: 500 }
    )
  }
}

