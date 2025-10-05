// Client-side authentication utilities

export interface UserSession {
  userId: string
  username: string
  expiresAt: number
}

export function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null
  
  const sessionStr = localStorage.getItem('movieTrackerSession')
  if (!sessionStr) return null

  try {
    const session: UserSession = JSON.parse(sessionStr)
    
    // Check if session expired
    if (session.expiresAt < Date.now()) {
      clearSession()
      return null
    }

    return session
  } catch {
    return null
  }
}

export function getUser() {
  if (typeof window === 'undefined') return null
  
  const userStr = localStorage.getItem('movieTrackerUser')
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('movieTrackerSession')
  localStorage.removeItem('movieTrackerUser')
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

