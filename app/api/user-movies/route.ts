import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { getDashboardData } from '@/lib/csv-reader'
import { rateLimitAPI } from '@/lib/rate-limit'

// Validation schemas
const addMovieSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  title: z.string().min(1).max(500),
  rating: z.string().regex(/^([0-9]|10|N\/A)?$/, 'Rating must be 0-10 or N/A').optional(),
  tags: z.string().max(500).optional(),
  type: z.enum(['watched', 'want', 'show']),
  posterUrl: z.string().url().optional().or(z.literal('')),
  poster_url: z.string().url().optional().or(z.literal('')),
  overview: z.string().max(2000).optional()
})

const updateMovieSchema = z.object({
  movieId: z.string().uuid('Invalid movie ID'),
  userId: z.string().uuid('Invalid user ID'),
  title: z.string().min(1).max(500).optional(),
  rating: z.string().regex(/^([0-9]|10|N\/A)?$/, 'Rating must be 0-10 or N/A').optional(),
  tags: z.string().max(500).optional(),
  type: z.enum(['watched', 'want', 'show']).optional(),
  posterUrl: z.string().url().optional().or(z.literal('')),
  poster_url: z.string().url().optional().or(z.literal('')),
  overview: z.string().max(2000).optional(),
  providers: z.any().optional(),
  credits: z.any().optional()
})

// ... (inside PUT)


// PUT: Update a movie
// GET: Fetch user's movies (prioritize database, fallback to CSV)
export async function GET(request: Request) {
  // Rate limiting for GET requests
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
  const rateLimitResult = await rateLimitAPI(ip)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
        }
      }
    )
  }
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') // 'watched', 'want', 'show'

    // If no userId, return CSV data (backward compatibility)
    if (!userId) {
      const data = await getDashboardData()
      return NextResponse.json({
        source: 'csv',
        watched: data.watched,
        want: data.wants,
        shows: data.shows,
        stats: {
          totalWatched: data.watched.length,
          totalWantToWatch: data.wants.length,
          totalShows: data.shows.length,
          averageRating: data.watchedStats.avgRating
        }
      })
    }

    // Fetch from database
    let query = supabase
      .from('movies')
      // Optimize: Exclude heavy columns like credits/overview. Include providers for filtering.
      .select('id, title, rating, tags, type, poster_url, providers, created_at, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    const { data: movies, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch movies' },
        { status: 500 }
      )
    }

    // Group by type
    const watched = movies?.filter(m => m.type === 'watched') || []
    const want = movies?.filter(m => m.type === 'want') || []
    const shows = movies?.filter(m => m.type === 'show') || []

    // Calculate stats
    const stats = {
      totalWatched: watched.length,
      totalWantToWatch: want.length,
      totalShows: shows.length,
      averageRating: watched.length > 0
        ? watched.reduce((sum, m) => sum + parseFloat(m.rating || '0'), 0) / watched.length
        : 0
    }

    return NextResponse.json({
      source: 'database',
      watched,
      want,
      shows,
      stats
    })
  } catch (error) {
    console.error('Get movies error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Add a new movie (write to both database and CSV)
export async function POST(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
  const rateLimitResult = await rateLimitAPI(ip)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
        }
      }
    )
  }

  try {
    const body = await request.json()
    const validatedData = addMovieSchema.parse(body)
    const { userId, title, rating, tags, type, posterUrl, overview, poster_url } = validatedData

    // Insert into database
    const { data: newMovie, error: insertError } = await supabase
      .from('movies')
      .insert([
        {
          user_id: userId,
          title,
          rating: rating || '',
          tags: tags || '',
          type,
          poster_url: posterUrl || poster_url || null,
          overview: overview || null
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Database error:', insertError)
      return NextResponse.json(
        { error: 'Failed to add movie' },
        { status: 500 }
      )
    }

    // TODO: Also append to CSV file (optional for now)
    // This would require file system write access which is limited on Vercel
    // Consider this as database-primary with CSV as backup

    return NextResponse.json({
      success: true,
      movie: newMovie
    })
  } catch (error: any) {
    console.error('Add movie error:', error)

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Update a movie
export async function PUT(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
  const rateLimitResult = await rateLimitAPI(ip)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
        }
      }
    )
  }

  try {
    const body = await request.json()
    const validatedData = updateMovieSchema.parse(body)
    const { movieId, userId, title, rating, tags, type, posterUrl, poster_url, overview, providers } = validatedData

    // Build update object dynamically
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (rating !== undefined) updateData.rating = rating
    if (tags !== undefined) updateData.tags = tags
    if (type !== undefined) {
      updateData.type = type
      // Bump to top of list when moving between lists
      updateData.created_at = new Date().toISOString()
    }
    if (posterUrl !== undefined) updateData.poster_url = posterUrl
    if (poster_url !== undefined) updateData.poster_url = poster_url
    if (overview !== undefined) updateData.overview = overview
    if (providers !== undefined) updateData.providers = providers
    if (validatedData.credits !== undefined) updateData.credits = validatedData.credits

    // Update in database
    const { data: updatedMovie, error: updateError } = await supabase
      .from('movies')
      .update(updateData)
      .eq('id', movieId)
      .eq('user_id', userId) // Ensure user owns this movie
      .select()
      .single()

    if (updateError) {
      console.error('Database error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update movie' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      movie: updatedMovie
    })
  } catch (error: any) {
    console.error('Update movie error:', error)

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
  const rateLimitResult = await rateLimitAPI(ip)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
        }
      }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const movieId = searchParams.get('movieId')
    const userId = searchParams.get('userId')

    if (!movieId || !userId) {
      return NextResponse.json(
        { error: 'movieId and userId are required' },
        { status: 400 }
      )
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('movies')
      .delete()
      .eq('id', movieId)
      .eq('user_id', userId) // Ensure user owns this movie

    if (deleteError) {
      console.error('Database error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete movie' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Delete movie error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

