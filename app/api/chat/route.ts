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

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationHistory: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })).max(10).optional(),
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
          error: 'Too many requests. Please wait a moment before trying again.',
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
    const validatedData = chatRequestSchema.parse(body)
    const { message, conversationHistory = [], userId } = validatedData

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get user's movie data
    let data: { watched: Movie[], wants: Movie[], shows: Movie[] }
    if (userId) {
      const { data: movies, error } = await supabase
        .from('movies')
        // Optimize: Only fetch columns needed for AI context
        .select('title, rating, type, tags')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user movies:', error)
        throw new Error('Failed to fetch user movies')
      }

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

    // Build user profile context
    const watchedRatings = data.watched.filter((m: Movie) => parseFloat(m.rating) > 0)
    const avgRating = watchedRatings.length > 0
      ? watchedRatings.reduce((sum, m) => sum + parseFloat(m.rating), 0) / watchedRatings.length
      : 0

    // Get top-rated movies
    const topRated = data.watched
      .filter((m: Movie) => parseFloat(m.rating) >= 9)
      .sort((a: Movie, b: Movie) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 30)
      .map((m: Movie) => `${m.title} (${m.rating}★)`)
      .join(', ')

    // Get liked movies (8 stars)
    const likedMovies = data.watched
      .filter((m: Movie) => parseFloat(m.rating) >= 8 && parseFloat(m.rating) < 9)
      .slice(0, 20)
      .map((m: Movie) => `${m.title} (${m.rating}★)`)
      .join(', ')

    // Get disliked movies
    const dislikedMovies = data.watched
      .filter((m: Movie) => parseFloat(m.rating) > 0 && parseFloat(m.rating) < 6)
      .slice(0, 15)
      .map((m: Movie) => `${m.title} (${m.rating}★)`)
      .join(', ')

    // Extract genre preferences
    const topRatedTags = data.watched
      .filter((m: Movie) => parseFloat(m.rating) >= 9 && m.tags)
      .flatMap((m: Movie) => m.tags!.split(';').map((t: string) => t.trim()))
      .filter((t: string) => t.length > 0)

    const tagCounts: Record<string, number> = {}
    topRatedTags.forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })

    const topGenres = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => `${tag} (${count} movies)`)
      .join(', ')

    // Get all watched titles to avoid recommending
    const allWatchedTitles = [
      ...data.watched.map((m: Movie) => m.title),
      ...data.shows.map((m: Movie) => m.title)
    ]

    // Sample of watched movies for context
    const watchedSample = allWatchedTitles.slice(0, 100).join(', ')

    // Get watchlist
    const watchlist = data.wants
      .slice(0, 20)
      .map((m: Movie) => m.title)
      .join(', ')

    // Build system prompt with user's movie profile
    const systemPrompt = `You are CineMate, a friendly and knowledgeable movie recommendation assistant with deep knowledge of cinema. You have a warm, enthusiastic personality and love helping people discover great movies. You're having a friendly conversation with a movie enthusiast.

USER'S MOVIE PROFILE:
- Total Movies Watched: ${data.watched.length}
- Total TV Shows: ${data.shows.length}
- Average Rating: ${avgRating.toFixed(1)}/10
- Watchlist: ${data.wants.length} movies

TOP-RATED MOVIES (9-10★):
${topRated || 'Not enough data yet'}

LIKED MOVIES (8★):
${likedMovies || 'Various titles'}

${topGenres ? `FAVORITE GENRES/THEMES:\n${topGenres}` : ''}

${dislikedMovies ? `MOVIES THEY DISLIKED (<6★):\n${dislikedMovies}` : ''}

${watchlist ? `THEIR WATCHLIST:\n${watchlist}` : ''}

ALREADY WATCHED (sample):
${watchedSample}

GUIDELINES:
- Provide personalized, conversational movie recommendations
- Reference their specific ratings and preferences when making suggestions
- NEVER recommend movies from their "Already Watched" list
- Ask clarifying questions to understand their mood or preferences better
- When recommending movies, explain WHY based on their taste
- Keep responses natural and engaging, not robotic
- You can discuss movies, provide insights, answer questions, and help them discover new films
- If they ask about specific movies, you can reference if they've already seen them
- Always provide thoughtful, contextual recommendations

Remember: You're a knowledgeable friend helping them discover great movies based on what you know they love!`

    // Build conversation messages
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    // Call OpenRouter
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini', // Fast and cost-effective
      // Alternative models:
      // 'anthropic/claude-3.5-sonnet' - More intelligent, better reasoning
      // 'openai/gpt-4-turbo' - More expensive but very capable
      messages: messages as any,
      temperature: 0.8, // More creative for conversation
      max_tokens: 1000,
    })

    const assistantMessage = response.choices[0]?.message?.content || 'I apologize, but I had trouble generating a response. Please try again.'

    return NextResponse.json({
      message: assistantMessage,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: assistantMessage }
      ]
    })

  } catch (error: any) {
    console.error('Error in chat:', error)

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
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
        { error: 'AI service quota exceeded. Please try again later.' },
        { status: 402 }
      )
    }

    if (error.status === 401 || error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'AI service authentication failed. Please contact support.' },
        { status: 401 }
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: `Chat error: ${error.message || 'Failed to process message'}` },
      { status: 500 }
    )
  }
}

