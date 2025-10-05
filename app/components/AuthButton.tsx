'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, clearSession } from '@/lib/auth'
import Link from 'next/link'

export default function AuthButton() {
  const router = useRouter()
  const [user, setUser] = useState<{ username: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

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
      <div className="relative flex items-center space-x-3">
        {/* Clickable Username - Links to Manage Movies */}
        <Link
          href="/manage-movies"
          className="text-white/90 text-sm font-medium hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
        >
          👤 {user.username}
        </Link>
        
        {/* Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="text-white font-medium px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200 flex items-center gap-2"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)}
              />
              
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-20 overflow-hidden border border-gray-200">
                <Link
                  href="/change-password"
                  className="block px-4 py-3 text-gray-700 hover:bg-purple-50 transition-colors text-sm font-medium"
                  onClick={() => setDropdownOpen(false)}
                >
                  🔐 Change Password
                </Link>
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    handleLogout()
                  }}
                  className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium border-t border-gray-200"
                >
                  🚪 Logout
                </button>
              </div>
            </>
          )}
        </div>
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

