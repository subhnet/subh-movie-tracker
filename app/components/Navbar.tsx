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

    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  useEffect(() => {
    setNavigatingTo(null)
  }, [pathname])

  if (pathname === '/login') return null

  const handleNavClick = (path: string) => {
    if (pathname !== path) setNavigatingTo(path)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-4 px-4 pointer-events-none">
      <nav
        className={`pointer-events-auto transition-all duration-500 ease-out border border-white/5
          ${scrolled
            ? 'bg-gray-900/80 backdrop-blur-2xl py-3 px-6 shadow-2xl shadow-black/20 w-full max-w-[1400px] rounded-2xl'
            : 'bg-transparent py-4 px-6 w-full max-w-[1600px] rounded-3xl'
          }
        `}
      >
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300 group-hover:scale-105">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
              CinePath
            </span>
          </Link>

          {/* Center Navigation - Desktop */}
          {isAuthenticated && (
            <div className={`hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 transition-all duration-300 ${scrolled ? 'bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md' : ''}`}>
              {[
                {
                  path: '/chat', label: 'AI Chat', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  )
                },
                {
                  path: '/recommendations', label: 'Discover', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )
                },
                {
                  path: '/manage-movies', label: 'Collection', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )
                },
                {
                  path: '/analytics', label: 'Analytics', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )
                }
              ].map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 group overflow-hidden
                     ${pathname === item.path
                      ? 'text-white bg-white/10 shadow-inner'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }
                   `}
                >
                  <span className={`relative z-10 transition-transform duration-300 ${pathname === item.path ? 'scale-105' : 'group-hover:scale-105'}`}>
                    {navigatingTo === item.path ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : item.icon}
                  </span>
                  <span className="relative z-10">{item.label}</span>
                  {pathname === item.path && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50" />
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <AuthButton />
          </div>
        </div>
      </nav>
    </div>
  )
}
