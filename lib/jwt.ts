import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production-min-32-chars'
)

export interface JWTPayload {
  userId: string
  username: string
  iat?: number
  exp?: number
}

/**
 * Create a JWT token for a user
 */
export async function createJWT(userId: string, username: string): Promise<string> {
  const token = await new SignJWT({ userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    // Validate that the payload has our required fields
    if (
      typeof payload.userId === 'string' && 
      typeof payload.username === 'string'
    ) {
      return {
        userId: payload.userId,
        username: payload.username,
        iat: payload.iat,
        exp: payload.exp
      }
    }
    
    return null
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * Get user from JWT cookie (server-side)
 */
export async function getUserFromJWT(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) {
    return null
  }

  return verifyJWT(token)
}

/**
 * Set JWT session cookie
 */
export function setSessionCookie(token: string) {
  return {
    name: 'session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: '/',
  }
}

/**
 * Clear session cookie
 */
export function clearSessionCookie() {
  return {
    name: 'session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  }
}

