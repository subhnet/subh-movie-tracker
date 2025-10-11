import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { rateLimitAuth } from '@/lib/rate-limit'
import { createJWT, setSessionCookie } from '@/lib/jwt'
import { logSecurity, logError } from '@/lib/logger'

// Validation schema
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100)
})

export async function POST(request: Request) {
  try {
    // Rate limiting - 5 login attempts per 10 seconds per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    const rateLimitResult = await rateLimitAuth(ip)
    
    if (!rateLimitResult.success) {
      logSecurity('Rate limit exceeded for login attempt', { ip, endpoint: '/api/auth/login' })
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
          }
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = loginSchema.parse(body)
    const { username, password } = validatedData

    // Find user by username
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1)

    if (fetchError) {
      console.error('Database error:', fetchError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      logSecurity('Login attempt with invalid username', { username, ip })
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const user = users[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      logSecurity('Login attempt with invalid password', { username, userId: user.id, ip })
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Successful login
    logSecurity('Successful login', { username, userId: user.id, ip })

    // Create JWT token
    const token = await createJWT(user.id, user.username)
    
    // Create session for client (without sensitive data)
    const session = {
      userId: user.id,
      username: user.username,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      },
      session
    })

    // Set httpOnly JWT cookie for server-side auth
    const cookieConfig = setSessionCookie(token)
    response.cookies.set(cookieConfig)

    // Also set a client-accessible cookie for client-side session info (no sensitive data)
    response.cookies.set('movieTrackerSession', JSON.stringify(session), {
      httpOnly: false, // Client can read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })

    return response
  } catch (error: any) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      logSecurity('Invalid login input', { error: error.errors, ip })
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }
    
    logError('Login error', error, { endpoint: '/api/auth/login', ip })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

