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
    <nav className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="group transition-all duration-300">
            <div>
              <span className="text-white font-black text-3xl tracking-tight bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent hover:from-blue-100 hover:to-purple-100 transition-all">
                CinePath
              </span>
            </div>
          </Link>
          <div className="flex items-center space-x-3">
            {isAuthenticated && (
              <Link 
                href="/recommendations" 
                className="group flex items-center gap-2 text-white/90 font-semibold px-5 py-2.5 rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/10 hover:border-white/30"
              >
                <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="hidden sm:inline">Recommendations</span>
              </Link>
            )}
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}


