'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth'
import StatCards from './components/StatCards'
import RatingChart from './components/RatingChart'
import TopRatedTable from './components/TopRatedTable'

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
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
          🎬 Movie Tracker Dashboard
        </h1>
        {user && (
          <p className="text-white/90 text-lg drop-shadow mb-2">
            Welcome back, <span className="font-semibold">{user.username}</span>! 👋
          </p>
        )}
        <p className="text-white/90 text-lg drop-shadow">
          Last Updated: {new Date().toLocaleString()}
        </p>
      </header>

      <StatCards 
        watched={data.watchedStats}
        wants={data.wantsStats}
        shows={data.showsStats}
      />

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

      <TopRatedTable 
        title="🌟 Top Rated Movies (8+ Stars)"
        movies={topRatedMovies}
      />

      <TopRatedTable 
        title="📺 Top Rated Shows"
        movies={topRatedShows}
      />
    </div>
  )
}
