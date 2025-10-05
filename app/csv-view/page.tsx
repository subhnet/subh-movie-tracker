'use client'

import { useEffect, useState } from 'react'
import StatCards from '../components/StatCards'
import RatingChart from '../components/RatingChart'
import TopRatedTable from '../components/TopRatedTable'

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

export default function CSVViewPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Always fetch CSV data (no userId parameter)
      const response = await fetch('/api/user-movies')
      const result = await response.json()

      setData({
        watched: result.watched,
        wants: result.want,
        shows: result.shows,
        watchedStats: calculateStats(result.watched),
        wantsStats: calculateStats(result.want),
        showsStats: calculateStats(result.shows),
      })
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch CSV data:', error)
      setLoading(false)
    }
  }

  const calculateStats = (movies: Movie[]): Stats => {
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
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white mt-4">Loading CSV data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-20">
          <p className="text-white text-xl">Failed to load CSV data. Please refresh the page.</p>
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
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-4 py-2 inline-block">
          <p className="text-yellow-200 text-sm">
            📂 CSV Mode - Viewing static data
          </p>
        </div>
        <p className="text-white/90 text-sm mt-2">
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
        movies={data.watched.filter((m: Movie) => parseFloat(m.rating) >= 8)}
      />

      <TopRatedTable 
        title="📺 Top Rated Shows"
        movies={data.shows.filter((m: Movie) => parseFloat(m.rating) >= 8)}
      />
    </div>
  )
}

