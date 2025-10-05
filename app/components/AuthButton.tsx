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

  const handleLogout = () => {
    clearSession()
    setUser(null)
    router.push('/login')
  }

  if (!mounted) return null

  if (user) {
    return (
      <div className="flex items-center space-x-3">
        <span className="text-white/90 text-sm font-medium">
          👤 {user.username}
        </span>
        <button
          onClick={handleLogout}
          className="text-white font-medium px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <Link
      href="/login"
      className="text-white font-medium px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200"
    >
      Login
    </Link>
  )
}

