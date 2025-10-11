import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { rateLimitAuth } from '@/lib/rate-limit'
import { createJWT, setSessionCookie } from '@/lib/jwt'
import { logSecurity, logError } from '@/lib/logger'

// Validation schema for Google auth
const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required')
})

/**
 * Step 1: Verify Google Token
 * Returns either:
 * - Existing user with session (login)
 * - New user flag requiring username selection
 */
export async function POST(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
  const rateLimitResult = await rateLimitAuth(ip)
  
  if (!rateLimitResult.success) {
    logSecurity('Rate limit exceeded for Google auth', { ip })
    return NextResponse.json(
      { error: 'Too many authentication attempts. Please try again later.' },
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
    const validatedData = googleAuthSchema.parse(body)
    const { credential } = validatedData

    // Verify the Google token with Google's API
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    )

    if (!response.ok) {
      logSecurity('Invalid Google token', { ip })
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401 }
      )
    }

    const googleUser = await response.json()

    // Validate Google response has required fields
    if (!googleUser.email || !googleUser.sub) {
      logError('Invalid Google user data', undefined, { googleUser })
      return NextResponse.json(
        { error: 'Invalid Google account data' },
        { status: 400 }
      )
    }

    // Check if user exists by email OR google_id
    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${googleUser.email},google_id.eq.${googleUser.sub}`)

    const existingUser = existingUsers?.[0]

    if (existingUser) {
      // Existing user - log them in
      logSecurity('Google login successful', { 
        userId: existingUser.id, 
        email: googleUser.email,
        ip 
      })

      // Update google_id if not set
      if (!existingUser.google_id) {
        await supabase
          .from('users')
          .update({ google_id: googleUser.sub })
          .eq('id', existingUser.id)
      }

      // Create JWT token
      const token = await createJWT(existingUser.id, existingUser.username)
      
      // Create session for client
      const session = {
        userId: existingUser.id,
        username: existingUser.username,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      }

      const responseObj = NextResponse.json({
        success: true,
        needsUsername: false,
        session,
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email
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
    } else {
      // New user - needs to choose username
      logSecurity('New Google user needs username', { 
        email: googleUser.email,
        googleId: googleUser.sub,
        ip 
      })

      // Create a temporary token to verify this request in the next step
      // This prevents someone from creating an account with any email
      const tempToken = await createJWT(googleUser.sub, googleUser.email)

      return NextResponse.json({
        success: true,
        needsUsername: true,
        tempToken,
        googleData: {
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          googleId: googleUser.sub
        }
      })
    }
  } catch (error: any) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      logSecurity('Invalid Google auth input', { error: error.errors, ip })
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    logError('Google auth error', error, { ip })
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

