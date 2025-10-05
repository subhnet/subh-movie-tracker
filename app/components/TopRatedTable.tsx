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
    .slice(0, 20)

  if (sortedMovies.length === 0) {
    return (
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 to-gray-400/10 rounded-2xl blur-xl"></div>
        <div className="relative bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/30">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
          <p className="text-gray-500">No items rated 8 or higher yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
      <div className="relative bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/30">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6">{title}</h2>
        <div className="overflow-x-auto -mx-8 px-8">
          <table className="w-full min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200/70">
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">#</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Poster</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Title</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Rating</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Watched Date</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedMovies.map((movie, index) => (
                <tr 
                  key={index}
                  className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 transition-all duration-200"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 font-bold text-sm">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="relative group/poster">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg blur-md group-hover/poster:blur-lg transition-all duration-200"></div>
                      <OptimizedImage
                        src={movie.poster_url}
                        alt={movie.title}
                        className="relative w-14 h-20 object-cover rounded-lg shadow-lg ring-2 ring-white/50"
                        fallbackIcon="🎬"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 font-bold text-gray-900">{movie.title}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-black shadow-lg">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {movie.rating}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-600 font-medium">
                    {movie.watchedDate || '-'}
                  </td>
                  <td className="px-4 py-4">
                    {movie.tags ? (
                      <div className="flex flex-wrap gap-2">
                        {movie.tags.split(';').map((tag, i) => (
                          <span 
                            key={i}
                            className="inline-block bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-200/50"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(TopRatedTable)

