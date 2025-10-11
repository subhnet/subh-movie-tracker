// Server-side authentication utilities for Server Components
import { cookies } from 'next/headers'

export interface User {
  id: string
  username: string
}

export interface ServerSession {
  userId: string
  username: string
  expiresAt: number
}

/**
 * Get the current user from server-side cookies
 * Use this in Server Components and Server Actions
 */
export async function getServerUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('movieTrackerSession')
  
  if (!sessionCookie) {
    return null
  }

  try {
    const session: ServerSession = JSON.parse(sessionCookie.value)
    
    // Check if session expired
    if (session.expiresAt < Date.now()) {
      return null
    }

    return {
      id: session.userId,
      username: session.username
    }
  } catch {
    return null
  }
}

/**
 * Check if user is authenticated on server-side
 */
export async function isServerAuthenticated(): Promise<boolean> {
  const user = await getServerUser()
  return user !== null
}


