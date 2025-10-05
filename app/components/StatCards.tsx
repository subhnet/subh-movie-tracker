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
      <div className="group relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
        <div className="relative bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-white/30">
          <div className="flex items-start justify-between mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <span className="text-3xl">🎬</span>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide">
              Watched
            </div>
          </div>
          <div className="space-y-1 mb-6">
            <div className="text-5xl font-black bg-gradient-to-br from-blue-600 to-purple-700 bg-clip-text text-transparent">
              {watched.total}
            </div>
            <p className="text-gray-600 text-sm font-semibold tracking-wide">Movies Watched</p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Rated</div>
              <div className="text-xl font-bold text-blue-600">{watched.rated}</div>
            </div>
            <div className="h-10 w-px bg-gray-200"></div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Average</div>
              <div className="text-xl font-bold text-purple-600 flex items-center gap-1">
                {watched.avgRating.toFixed(1)}
                <span className="text-yellow-500">★</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Want to Watch Card */}
      <div className="group relative">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
        <div className="relative bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-white/30">
          <div className="flex items-start justify-between mb-6">
            <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-3 rounded-xl shadow-lg">
              <span className="text-3xl">⭐</span>
            </div>
            <div className="bg-gradient-to-br from-pink-100 to-rose-100 text-pink-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide">
              Watchlist
            </div>
          </div>
          <div className="space-y-1 mb-6">
            <div className="text-5xl font-black bg-gradient-to-br from-pink-600 to-rose-700 bg-clip-text text-transparent">
              {wants.total}
            </div>
            <p className="text-gray-600 text-sm font-semibold tracking-wide">Movies to Watch</p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pre-rated</div>
              <div className="text-xl font-bold text-pink-600">{wants.rated}</div>
            </div>
            <div className="h-10 w-px bg-gray-200"></div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Complete</div>
              <div className="text-xl font-bold text-rose-600">{completionRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* TV Shows Card */}
      <div className="group relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
        <div className="relative bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-white/30">
          <div className="flex items-start justify-between mb-6">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <span className="text-3xl">📺</span>
            </div>
            <div className="bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide">
              Shows
            </div>
          </div>
          <div className="space-y-1 mb-6">
            <div className="text-5xl font-black bg-gradient-to-br from-cyan-600 to-blue-700 bg-clip-text text-transparent">
              {shows.total}
            </div>
            <p className="text-gray-600 text-sm font-semibold tracking-wide">TV Shows Tracked</p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Rated</div>
              <div className="text-xl font-bold text-cyan-600">{shows.rated}</div>
            </div>
            <div className="h-10 w-px bg-gray-200"></div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Average</div>
              <div className="text-xl font-bold text-blue-600 flex items-center gap-1">
                {shows.avgRating.toFixed(1)}
                <span className="text-yellow-500">★</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(StatCards)

