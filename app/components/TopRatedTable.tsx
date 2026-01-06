import { memo } from 'react'
import type { Movie } from '@/lib/types'
import OptimizedImage from './OptimizedImage'

interface TopRatedTableProps {
  title: string
  movies: Movie[]
}

function TopRatedTable({ title, movies }: TopRatedTableProps) {
  const sortedMovies = movies
    .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    .slice(0, 5)

  if (sortedMovies.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 h-full flex flex-col items-center justify-center text-white/30 space-y-2 min-h-[150px]">
        <h3 className="font-bold text-white text-lg tracking-tight self-start mb-auto">{title}</h3>
        <div className="flex flex-col items-center justify-center flex-1">
          <span className="text-2xl">📭</span>
          <span className="text-xs font-medium">No top rated items yet</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-bold text-white text-lg tracking-tight">{title}</h3>
      </div>

      <div className="flex-1 overflow-auto pr-1 custom-scrollbar">
        <div className="space-y-1">
          {sortedMovies.map((movie, index) => (
            <div
              key={movie.id}
              className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
            >
              <div className="flex-shrink-0 font-mono text-xs font-bold text-white/30 w-4 text-center">
                {index + 1}
              </div>

              <div className="relative flex-shrink-0 w-10 h-14 rounded-lg overflow-hidden shadow-md bg-white/5">
                <OptimizedImage
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  fallbackIcon="🎬"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-200 transition-colors">
                  {movie.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1 text-yellow-400">
                    <span className="text-xs">★</span>
                    <span className="text-xs font-bold text-white/90">{movie.rating}</span>
                  </div>
                  <span className="text-[10px] text-white/40">•</span>
                  <span className="text-[10px] text-white/40 truncate max-w-[100px]">
                    {new Date(movie.created_at || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default memo(TopRatedTable)
