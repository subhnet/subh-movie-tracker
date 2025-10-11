import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/jwt'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  })

  // Clear JWT session cookie
  const cookieConfig = clearSessionCookie()
  response.cookies.set(cookieConfig)

  // Also clear client-side session cookie
  response.cookies.set('movieTrackerSession', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })

  return response
}

