import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getDashboardData } from '@/lib/csv-reader'
import { supabase } from '@/lib/supabase'

// Movie type definition
interface Movie {
  title: string
  rating: string
  tags?: string
  [key: string]: any
}

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
    const { type = 'general', userId } = await request.json()
    
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
      prompt = `Analyze this user's movie taste:

PERFECT SCORES (10/10): ${perfectRated || 'None yet'}

HIGHLY RATED (9-10★): ${highlyRated}

Their watchlist includes: ${watchlist}

From their watchlist, recommend which 5 movies they should watch FIRST and why, based on their taste preferences shown above.

Return a JSON object with a "recommendations" array. Each item should have: title, reason, confidence (0-100).

Example format:
{
  "recommendations": [
    {"title": "Movie Name", "reason": "Why this movie", "confidence": 95}
  ]
}`
    } else {
      // Calculate stats on the fly
      const watchedRatings = data.watched.filter((m: Movie) => parseFloat(m.rating) > 0)
      const avgRating = watchedRatings.length > 0
        ? watchedRatings.reduce((sum, m) => sum + parseFloat(m.rating), 0) / watchedRatings.length
        : 0
      
      prompt = `Analyze this user's movie taste to recommend NEW movies they haven't seen:

USER'S RATING PROFILE:
- Average Rating: ${avgRating.toFixed(1)}/10
- Total Movies Watched: ${data.watched.length}
- Total TV Shows: ${data.shows.length}

MOVIES THEY LOVED (9-10★):
${highlyRated}

MOVIES THEY LIKED (8★):
${goodMovies || 'Various titles'}

${topGenres ? `PREFERRED GENRES/THEMES (from top-rated movies):\n${topGenres}\n\nRecommendations should lean towards these genres.` : ''}

${dislikedMovies ? `MOVIES THEY DISLIKED (<6★):\n${dislikedMovies}\n\nAVOID recommending movies similar to these.` : ''}

CRITICAL - They've ALREADY SEEN these (do NOT recommend):
${watchedSample}

TASK: Recommend 5 NEW movies they HAVEN'T seen that match their taste profile above. Focus on movies similar to their 9-10★ rated films and preferred genres.

Return a JSON object with a "recommendations" array. Each item should have: title, reason (explain why based on their ratings), confidence (0-100), genres (array of strings).

Example format:
{
  "recommendations": [
    {"title": "Movie Name", "reason": "Since you loved [their 10★ movie], this shares similar themes/style", "confidence": 90, "genres": ["Drama", "Thriller"]}
  ]
}`
    }
    
    // Call OpenRouter (using a capable model like GPT-4 or Claude)
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini', // Cost-effective and fast model
      // Alternative models you can try:
      // 'anthropic/claude-3.5-sonnet' - Very intelligent, great reasoning
      // 'openai/gpt-4-turbo' - More expensive but very capable
      // 'google/gemini-pro' - Good balance of speed and quality
      messages: [
        {
          role: 'system',
          content: 'You are a movie recommendation expert. Analyze viewing patterns and provide personalized recommendations. Respond with valid JSON array only, no markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' } as any, // Force JSON output
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

