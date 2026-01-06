'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getUser } from '@/lib/auth'
import AuthButton from './AuthButton'

export default function Navbar() {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

  useEffect(() => {
    const user = getUser()
    setIsAuthenticated(!!user)

    // Add scroll listener for dynamic navbar effect
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  // Reset navigation state when pathname changes
  useEffect(() => {
    setNavigatingTo(null)
  }, [pathname])

  // Don't show navbar on login page
  if (pathname === '/login') {
    return null
  }

  const handleNavClick = (path: string) => {
    if (pathname !== path) {
      setNavigatingTo(path)
    }
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-gray-900/80 backdrop-blur-xl border-b border-white/10 py-3 shadow-2xl'
          : 'bg-transparent py-5'
        }`}
    >
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex justify-between items-center">
          {/* Logo Section */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-105">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tight text-white group-hover:text-blue-200 transition-colors">
              CinePath
            </span>
          </Link>

          {/* Actions Section */}
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl p-1.5 backdrop-blur-md">
                <Link
                  href="/chat"
                  onClick={() => handleNavClick('/chat')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${pathname === '/chat'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {navigatingTo === '/chat' ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  )}
                  <span>AI Chat</span>
                </Link>

                <Link
                  href="/recommendations"
                  onClick={() => handleNavClick('/recommendations')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${pathname === '/recommendations'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {navigatingTo === '/recommendations' ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  <span>Discover</span>
                </Link>

                <div className="w-px h-6 bg-white/10 mx-1"></div>

                <Link
                  href="/manage-movies"
                  onClick={() => handleNavClick('/manage-movies')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${pathname === '/manage-movies'
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {navigatingTo === '/manage-movies' ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                  <span>Collection</span>
                </Link>
              </div>
            )}

            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
