import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { credential } = await request.json()

    if (!credential) {
      return NextResponse.json(
        { error: 'No credential provided' },
        { status: 400 }
      )
    }

    // Verify the Google token with Google's API
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      )
    }

    const googleUser = await response.json()

    // Check if user exists in Supabase
    const { supabase } = await import('@/lib/supabase')

    // Try to find user by email
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', googleUser.email)
      .single()

    let user

    if (existingUser) {
      // User exists, update Google info if needed
      const { data: updatedUser } = await supabase
        .from('users')
        .update({
          google_id: googleUser.sub,
          username: existingUser.username || googleUser.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      user = updatedUser || existingUser
    } else {
      // Create new user from Google account
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          username: googleUser.name,
          email: googleUser.email,
          google_id: googleUser.sub,
          password_hash: '', // No password for Google users
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      user = newUser
    }

    // Create session
    const session = {
      userId: user.id,
      username: user.username,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    }

    return NextResponse.json({
      success: true,
      session,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

