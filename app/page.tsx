'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth'
import StatCards from './components/StatCards'
import RatingChart from './components/RatingChart'
import TopRatedTable from './components/TopRatedTable'
import QuickAdd from './components/QuickAdd'

interface Stats {
  total: number
  rated: number
  avgRating: number
  distribution: Record<number, number>
}

interface Movie {
  title: string
  rating: string
  tags: string
  [key: string]: any
}

export default function Dashboard() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Memoize calculateStats to prevent recalculation on every render
  const calculateStats = useCallback((movies: Movie[]): Stats => {
    const rated = movies.filter(m => m.rating && parseFloat(m.rating) > 0)
    const distribution: Record<number, number> = {}
    
    rated.forEach(movie => {
      const rating = Math.floor(parseFloat(movie.rating))
      distribution[rating] = (distribution[rating] || 0) + 1
    })

    const avgRating = rated.length > 0
      ? rated.reduce((sum, m) => sum + parseFloat(m.rating), 0) / rated.length
      : 0

    return {
      total: movies.length,
      rated: rated.length,
      avgRating,
      distribution
    }
  }, [])

  // Memoize filtered movies to prevent recalculation on every render
  // Must be called before any conditional returns (Rules of Hooks)
  const topRatedMovies = useMemo(() => {
    if (!data) return []
    return data.watched.filter((m: Movie) => parseFloat(m.rating) >= 8)
  }, [data])

  const topRatedShows = useMemo(() => {
    if (!data) return []
    return data.shows.filter((m: Movie) => parseFloat(m.rating) >= 8)
  }, [data])

  useEffect(() => {
    const currentUser = getUser()
    
    // Redirect to login if not authenticated
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    setUser(currentUser)
    fetchData(currentUser.id)
  }, [router])

  const fetchData = async (userId?: string) => {
    try {
      // If user is logged in, fetch from database, otherwise use CSV
      const url = userId ? `/api/user-movies?userId=${userId}` : '/api/user-movies'
      const response = await fetch(url)
      const result = await response.json()

      const movies = {
        watched: result.watched || [],
        wants: result.want || [],
        shows: result.shows || []
      }

      setData({
        ...movies,
        watchedStats: calculateStats(movies.watched),
        wantsStats: calculateStats(movies.wants),
        showsStats: calculateStats(movies.shows),
      })
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setLoading(false)
    }
  }

  const handleAddMovie = async (title: string, type: string, rating: string, posterUrl?: string, overview?: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/user-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title,
          type,
          rating: rating || '',
          tags: '',
          poster_url: posterUrl,
          overview: overview
        })
      })

      if (!response.ok) throw new Error('Failed to add movie')
      
      // Refresh data
      await fetchData(user.id)
    } catch (error) {
      console.error('Failed to add movie:', error)
      throw error
    }
  }

  const allMovies = useMemo(() => {
    if (!data) return []
    return [...data.watched, ...data.wants, ...data.shows]
  }, [data])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white mt-4">Loading your movies...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-20">
          <p className="text-white text-xl">Failed to load data. Please refresh the page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Hero Section */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 p-8 md:p-12 shadow-2xl">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-4 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
              CinePath
            </h1>
            <p className="text-white/70 text-lg md:text-xl mb-4">Your Personal Movie Journey</p>
            {user && (
              <p className="text-white/80 text-xl md:text-2xl">
                Welcome back,{' '}
                <a 
                  href="/manage-movies"
                  className="font-bold text-white hover:text-blue-300 hover:underline decoration-2 underline-offset-4 cursor-pointer transition-all inline-flex items-center gap-1"
                >
                  {user.username}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-white">Overview</h2>
        </div>
        <StatCards 
          watched={data.watchedStats}
          wants={data.wantsStats}
          shows={data.showsStats}
        />
      </div>

      {/* Charts Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-white">Rating Distribution</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RatingChart 
            title="🍿 Watched Movies Distribution"
            distribution={data.watchedStats.distribution}
            color="rgba(102, 126, 234, 0.8)"
          />
          <RatingChart 
            title="📺 TV Shows Distribution"
            distribution={data.showsStats.distribution}
            color="rgba(79, 172, 254, 0.8)"
          />
        </div>
      </div>

      {/* Top Rated Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-white">Your Top Rated</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopRatedTable 
            title="🎬 Your Top Movies"
            movies={topRatedMovies}
          />

          <TopRatedTable 
            title="📺 Your Top Shows"
            movies={topRatedShows}
          />
        </div>
      </div>

      {/* Quick Add FAB */}
      <QuickAdd
        onAdd={handleAddMovie}
        existingMovies={allMovies.map((m: any) => ({ title: m.title, type: m.type }))}
      />
    </div>
  )
}
