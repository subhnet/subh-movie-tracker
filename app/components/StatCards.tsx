'use client'

interface StatProps {
  watched: any
  wants: any
  shows: any
}

export default function StatCards({ watched, wants, shows }: StatProps) {
  const completionRate = Math.round((watched.total / (watched.total + wants.total)) * 100) || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Watched Movies Card */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl blur-lg opacity-40 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Total Watched</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{watched.total}</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <span className="text-xl">🎬</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Rated</div>
              <div className="text-sm font-semibold text-white">{watched.rated}</div>
            </div>
            <div className="w-px h-6 bg-white/5"></div>
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Avg Score</div>
              <div className="text-sm font-bold text-blue-300 flex items-center gap-1">
                {watched.avgRating.toFixed(1)} <span className="text-[10px]">★</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Watchlist Card */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-2xl blur-lg opacity-40 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Watchlist</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{wants.total}</h3>
            </div>
            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
              <span className="text-xl">📌</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">To Go</div>
              <div className="text-sm font-semibold text-white">{wants.rated}</div>
            </div>
            <div className="w-px h-6 bg-white/5"></div>
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Progress</div>
              <div className="text-sm font-bold text-pink-300">
                {completionRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shows Card */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl blur-lg opacity-40 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">TV Shows</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{shows.total}</h3>
            </div>
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
              <span className="text-xl">📺</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Rated</div>
              <div className="text-sm font-semibold text-white">{shows.rated}</div>
            </div>
            <div className="w-px h-6 bg-white/5"></div>
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Avg Score</div>
              <div className="text-sm font-bold text-cyan-300 flex items-center gap-1">
                {shows.avgRating.toFixed(1)} <span className="text-[10px]">★</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
