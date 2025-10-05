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
      <div className="bg-white rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-500">No items rated 8 or higher yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-primary-500 text-white">
              <th className="px-4 py-3 text-left rounded-tl-lg">#</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Rating</th>
              <th className="px-4 py-3 text-left">Watched Date</th>
              <th className="px-4 py-3 text-left rounded-tr-lg">Tags</th>
            </tr>
          </thead>
          <tbody>
            {sortedMovies.map((movie, index) => (
              <tr 
                key={index}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">{movie.title}</td>
                <td className="px-4 py-3">
                  <span className="inline-block bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {movie.rating}★
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {movie.watchedDate || '-'}
                </td>
                <td className="px-4 py-3">
                  {movie.tags ? (
                    <div className="flex flex-wrap gap-1">
                      {movie.tags.split(';').map((tag, i) => (
                        <span 
                          key={i}
                          className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs"
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

