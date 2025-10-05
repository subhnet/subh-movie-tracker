'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getUser } from '@/lib/auth'
import AuthButton from './AuthButton'

export default function Navbar() {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const user = getUser()
    setIsAuthenticated(!!user)
  }, [pathname]) // Re-check on route change

  // Don't show navbar on login page
  if (pathname === '/login') {
    return null
  }

  return (
    <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
            <span className="text-3xl">🎬</span>
            <span className="text-white font-bold text-xl tracking-tight">Movie Tracker</span>
          </Link>
          <div className="flex items-center space-x-2">
            {isAuthenticated && (
              <>
                <Link 
                  href="/" 
                  className="text-white font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/manage-movies" 
                  className="text-white font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
                >
                  Manage Movies
                </Link>
              </>
            )}
            <Link 
              href="/recommendations" 
              className="text-white font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
            >
              AI Recommendations
            </Link>
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}

