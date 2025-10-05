import type { Movie } from '@/lib/types'

interface TopRatedTableProps {
  title: string
  movies: Movie[]
}

export default function TopRatedTable({ title, movies }: TopRatedTableProps) {
  const sortedMovies = movies
    .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    .slice(0, 20)

  if (sortedMovies.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-500">No items rated 8 or higher yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full min-w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">#</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Poster</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Title</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Rating</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Watched Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedMovies.map((movie, index) => (
              <tr 
                key={index}
                className="hover:bg-primary-50/50 transition-colors"
              >
                <td className="px-6 py-4 text-gray-500 font-medium text-sm">{index + 1}</td>
                <td className="px-6 py-4">
                  {movie.poster_url ? (
                    <img 
                      src={movie.poster_url} 
                      alt={movie.title}
                      className="w-12 h-16 object-cover rounded shadow-md"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center text-xl">
                      🎬
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-semibold text-gray-900 text-base">{movie.title}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                    {movie.rating}★
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 text-sm">
                  {movie.watchedDate || '-'}
                </td>
                <td className="px-6 py-4">
                  {movie.tags ? (
                    <div className="flex flex-wrap gap-2">
                      {movie.tags.split(';').map((tag, i) => (
                        <span 
                          key={i}
                          className="inline-block bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-medium"
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
  )
}

