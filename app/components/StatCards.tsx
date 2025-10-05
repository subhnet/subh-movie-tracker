import type { MovieStats } from '@/lib/types'

interface StatCardsProps {
  watched: MovieStats
  wants: MovieStats
  shows: MovieStats
}

export default function StatCards({ watched, wants, shows }: StatCardsProps) {
  const completionRate = watched.total > 0 
    ? ((watched.total / (watched.total + wants.total)) * 100).toFixed(1)
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Watched Movies Card */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">🍿</span>
          <h3 className="text-white text-xl font-semibold">Watched Movies</h3>
        </div>
        <div className="text-white">
          <div className="text-5xl font-bold mb-2">{watched.total}</div>
          <p className="text-white/80 text-sm mb-4">Total Movies Watched</p>
          <div className="flex justify-between text-sm pt-4 border-t border-white/20">
            <span>Rated: {watched.rated}</span>
            <span>Avg: {watched.avgRating}★</span>
          </div>
        </div>
      </div>

      {/* Want to Watch Card */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">📝</span>
          <h3 className="text-white text-xl font-semibold">Want to Watch</h3>
        </div>
        <div className="text-white">
          <div className="text-5xl font-bold mb-2">{wants.total}</div>
          <p className="text-white/80 text-sm mb-4">Movies on Watchlist</p>
          <div className="flex justify-between text-sm pt-4 border-t border-white/20">
            <span>Pre-rated: {wants.rated}</span>
            <span>{completionRate}% Complete</span>
          </div>
        </div>
      </div>

      {/* TV Shows Card */}
      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">📺</span>
          <h3 className="text-white text-xl font-semibold">TV Shows</h3>
        </div>
        <div className="text-white">
          <div className="text-5xl font-bold mb-2">{shows.total}</div>
          <p className="text-white/80 text-sm mb-4">TV Shows Tracked</p>
          <div className="flex justify-between text-sm pt-4 border-t border-white/20">
            <span>Rated: {shows.rated}</span>
            <span>Avg: {shows.avgRating}★</span>
          </div>
        </div>
      </div>
    </div>
  )
}

