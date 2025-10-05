import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getDashboardData } from '@/lib/csv-reader'

// GET: Fetch user's movies (prioritize database, fallback to CSV)
export async function GET(request: Request) {
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
      .select('*')
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
  try {
    const { userId, title, rating, tags, type } = await request.json()

    if (!userId || !title || !type) {
      return NextResponse.json(
        { error: 'userId, title, and type are required' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['watched', 'want', 'show'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be one of: watched, want, show' },
        { status: 400 }
      )
    }

    // Insert into database
    const { data: newMovie, error: insertError } = await supabase
      .from('movies')
      .insert([
        {
          user_id: userId,
          title,
          rating: rating || '',
          tags: tags || '',
          type
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
  } catch (error) {
    console.error('Add movie error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Update a movie
export async function PUT(request: Request) {
  try {
    const { movieId, userId, title, rating, tags, type } = await request.json()

    if (!movieId || !userId) {
      return NextResponse.json(
        { error: 'movieId and userId are required' },
        { status: 400 }
      )
    }

    // Validate type if provided
    if (type && !['watched', 'want', 'show'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be one of: watched, want, show' },
        { status: 400 }
      )
    }

    // Build update object dynamically
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (rating !== undefined) updateData.rating = rating
    if (tags !== undefined) updateData.tags = tags
    if (type !== undefined) updateData.type = type

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
  } catch (error) {
    console.error('Update movie error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Remove a movie
export async function DELETE(request: Request) {
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

