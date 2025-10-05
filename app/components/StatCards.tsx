import { memo } from 'react'
import type { MovieStats } from '@/lib/types'

interface StatCardsProps {
  watched: MovieStats
  wants: MovieStats
  shows: MovieStats
}

function StatCards({ watched, wants, shows }: StatCardsProps) {
  const completionRate = watched.total > 0 
    ? ((watched.total / (watched.total + wants.total)) * 100).toFixed(1)
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Watched Movies Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-white/20">
        <div className="flex items-center mb-4">
          <span className="text-4xl mr-3">🍿</span>
          <h3 className="text-gray-800 text-xl font-bold">Watched Movies</h3>
        </div>
        <div>
          <div className="text-6xl font-bold mb-2 bg-gradient-to-br from-primary-600 to-primary-700 bg-clip-text text-transparent">
            {watched.total}
          </div>
          <p className="text-gray-600 text-sm mb-4 font-medium">Total Movies Watched</p>
          <div className="flex justify-between text-sm pt-4 border-t border-gray-200">
            <span className="text-gray-700 font-medium">Rated: <span className="font-bold text-primary-600">{watched.rated}</span></span>
            <span className="text-gray-700 font-medium">Avg: <span className="font-bold text-primary-600">{watched.avgRating}★</span></span>
          </div>
        </div>
      </div>

      {/* Want to Watch Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-white/20">
        <div className="flex items-center mb-4">
          <span className="text-4xl mr-3">📝</span>
          <h3 className="text-gray-800 text-xl font-bold">Want to Watch</h3>
        </div>
        <div>
          <div className="text-6xl font-bold mb-2 bg-gradient-to-br from-pink-600 to-rose-600 bg-clip-text text-transparent">
            {wants.total}
          </div>
          <p className="text-gray-600 text-sm mb-4 font-medium">Movies on Watchlist</p>
          <div className="flex justify-between text-sm pt-4 border-t border-gray-200">
            <span className="text-gray-700 font-medium">Pre-rated: <span className="font-bold text-pink-600">{wants.rated}</span></span>
            <span className="text-gray-700 font-medium"><span className="font-bold text-pink-600">{completionRate}%</span> Complete</span>
          </div>
        </div>
      </div>

      {/* TV Shows Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-white/20">
        <div className="flex items-center mb-4">
          <span className="text-4xl mr-3">📺</span>
          <h3 className="text-gray-800 text-xl font-bold">TV Shows</h3>
        </div>
        <div>
          <div className="text-6xl font-bold mb-2 bg-gradient-to-br from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            {shows.total}
          </div>
          <p className="text-gray-600 text-sm mb-4 font-medium">TV Shows Tracked</p>
          <div className="flex justify-between text-sm pt-4 border-t border-gray-200">
            <span className="text-gray-700 font-medium">Rated: <span className="font-bold text-cyan-600">{shows.rated}</span></span>
            <span className="text-gray-700 font-medium">Avg: <span className="font-bold text-cyan-600">{shows.avgRating}★</span></span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(StatCards)

