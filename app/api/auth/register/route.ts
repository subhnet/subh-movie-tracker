import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { rateLimitAuth } from '@/lib/rate-limit'

// Validation schema with stronger password requirements
const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
})

export async function POST(request: Request) {
  try {
    // Rate limiting - 5 registration attempts per 10 seconds per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    const rateLimitResult = await rateLimitAuth(ip)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many registration attempts. Please try again later.',
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
    const validatedData = registerSchema.parse(body)
    const { username, password } = validatedData

    // Check if username already exists
    const { data: existingUsers } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .limit(1)

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      )
    }

    // Hash password
    const saltRounds = 10
    const password_hash = await bcrypt.hash(password, saltRounds)

    // Create user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          username,
          password_hash
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Database error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username
      }
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    
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

