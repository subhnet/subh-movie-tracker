'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, clearSession } from '@/lib/auth'
import Link from 'next/link'

export default function AuthButton() {
  const router = useRouter()
  const [user, setUser] = useState<{ username: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setUser(getUser())
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      clearSession()
      setUser(null)
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (!mounted) return null

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-6 py-2.5 bg-white text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg hover:shadow-white/20 active:scale-95"
      >
        Sign In
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex flex-col items-end mr-2">
        <span className="text-xs text-white/40 font-medium uppercase tracking-wider">Signed in as</span>
        <span className="text-sm font-bold text-white">{user.username}</span>
      </div>
      <button
        onClick={handleLogout}
        className="group flex items-center gap-2 pl-3 pr-4 py-2 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-200 border border-white/10 hover:border-red-500/30 rounded-xl transition-all duration-200"
      >
        <div className="bg-white/10 group-hover:bg-red-500/20 p-1 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
        <span className="font-semibold text-sm">Logout</span>
      </button>
    </div>
  )
}
