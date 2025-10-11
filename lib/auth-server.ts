// Server-side authentication utilities for Server Components
import { getUserFromJWT } from './jwt'

export interface User {
  id: string
  username: string
}

/**
 * Get the current user from server-side JWT cookie
 * Use this in Server Components and Server Actions
 */
export async function getServerUser(): Promise<User | null> {
  const payload = await getUserFromJWT()
  
  if (!payload) {
    return null
  }

  return {
    id: payload.userId,
    username: payload.username
  }
}

/**
 * Check if user is authenticated on server-side
 */
export async function isServerAuthenticated(): Promise<boolean> {
  const user = await getServerUser()
  return user !== null
}


