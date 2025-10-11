import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { rateLimitAuth } from '@/lib/rate-limit'
import { createJWT, setSessionCookie, verifyJWT } from '@/lib/jwt'
import { logSecurity, logError } from '@/lib/logger'

// Validation schema for completing Google signup
const completeGoogleSignupSchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  googleData: z.object({
    email: z.string().email(),
    name: z.string().optional(),
    picture: z.string().optional(),
    googleId: z.string()
  })
})

/**
 * Step 2: Complete Google Signup with Username
 * Creates user account with chosen username
 */
export async function POST(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
  const rateLimitResult = await rateLimitAuth(ip)
  
  if (!rateLimitResult.success) {
    logSecurity('Rate limit exceeded for Google signup completion', { ip })
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
        }
      }
    )
  }

  try {
    // Validate input
    const body = await request.json()
    const validatedData = completeGoogleSignupSchema.parse(body)
    const { tempToken, username, googleData } = validatedData

    // Verify the temporary token
    const tokenPayload = await verifyJWT(tempToken)
    if (!tokenPayload || tokenPayload.userId !== googleData.googleId) {
      logSecurity('Invalid temporary token for Google signup', { 
        username, 
        email: googleData.email,
        ip 
      })
      return NextResponse.json(
        { error: 'Invalid or expired signup session. Please try again.' },
        { status: 401 }
      )
    }

    // Check if username is already taken
    const { data: existingUsername } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUsername) {
      logSecurity('Username already taken during Google signup', { 
        username,
        email: googleData.email,
        ip 
      })
      return NextResponse.json(
        { error: 'Username already taken. Please choose another.' },
        { status: 409 }
      )
    }

    // Check if email is already registered (shouldn't happen if Step 1 was correct)
    const { data: existingEmail } = await supabase
      .from('users')
      .select('email')
      .eq('email', googleData.email)
      .single()

    if (existingEmail) {
      logSecurity('Email already exists during Google signup', { 
        username,
        email: googleData.email,
        ip 
      })
      return NextResponse.json(
        { error: 'Email already registered. Please login instead.' },
        { status: 409 }
      )
    }

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        email: googleData.email,
        google_id: googleData.googleId,
        password_hash: null, // No password for Google users
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError || !newUser) {
      logError(
        'Failed to create Google user', 
        insertError ? new Error(insertError.message) : undefined,
        { 
          username,
          email: googleData.email,
          ip,
          dbError: insertError
        }
      )
      return NextResponse.json(
        { error: 'Failed to create user account. Please try again.' },
        { status: 500 }
      )
    }

    logSecurity('Google signup completed successfully', { 
      userId: newUser.id,
      username,
      email: googleData.email,
      ip 
    })

    // Create JWT token
    const token = await createJWT(newUser.id, newUser.username)
    
    // Create session for client
    const session = {
      userId: newUser.id,
      username: newUser.username,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    }

    const responseObj = NextResponse.json({
      success: true,
      session,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    })

    // Set httpOnly JWT cookie
    const cookieConfig = setSessionCookie(token)
    responseObj.cookies.set(cookieConfig)

    // Also set client-accessible session cookie
    responseObj.cookies.set('movieTrackerSession', JSON.stringify(session), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })

    return responseObj
  } catch (error: any) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      logSecurity('Invalid Google signup completion input', { error: error.errors, ip })
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    logError('Google signup completion error', error, { ip })
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}

