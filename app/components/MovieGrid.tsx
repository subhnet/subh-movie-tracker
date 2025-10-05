'use client'

import { useState } from 'react'

interface Movie {
  id: string
  title: string
  rating: string
  tags: string
  type: string
  poster_url?: string | null
  created_at?: string
}

interface MovieGridProps {
  movies: Movie[]
  onMoveMovie: (movieId: string, newType: string) => Promise<void>
  onUpdateMovie: (movieId: string, updates: { title?: string; rating?: string; tags?: string }) => Promise<void>
  onDeleteMovie: (movieId: string) => Promise<void>
  currentType: string
}

export default function MovieGrid({ movies, onMoveMovie, onUpdateMovie, onDeleteMovie, currentType }: MovieGridProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', rating: '', tags: '' })
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState<string | null>(null)

  const handleEdit = (movie: Movie) => {
    setEditingId(movie.id)
    setEditForm({
      title: movie.title,
      rating: movie.rating || '',
      tags: movie.tags || ''
    })
  }

  const handleSaveEdit = async (movieId: string) => {
    try {
      await onUpdateMovie(movieId, editForm)
      setEditingId(null)
    } catch (error) {
      console.error('Failed to update movie:', error)
      alert('Failed to update movie')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ title: '', rating: '', tags: '' })
  }

  const handleMove = async (movieId: string, newType: string) => {
    setIsMoving(movieId)
    try {
      await onMoveMovie(movieId, newType)
    } catch (error) {
      console.error('Failed to move movie:', error)
      alert('Failed to move movie')
    } finally {
      setIsMoving(null)
    }
  }

  const handleDelete = async (movieId: string) => {
    if (!confirm('Are you sure you want to delete this movie?')) return
    
    setIsDeleting(movieId)
    try {
      await onDeleteMovie(movieId)
    } catch (error) {
      console.error('Failed to delete movie:', error)
      alert('Failed to delete movie')
    } finally {
      setIsDeleting(null)
    }
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
        <p className="text-white/60 text-lg">No movies in this list yet</p>
        <p className="text-white/40 text-sm mt-2">Click "Add Movie" to get started</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {movies.map((movie) => (
        <div
          key={movie.id}
          className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden hover:bg-white/10 transition-all hover:scale-105 group"
        >
          {editingId === movie.id ? (
            // Edit mode
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Title"
              />
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={editForm.rating}
                onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rating"
              />
              <input
                type="text"
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tags"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveEdit(movie.id)}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Poster */}
              <div className="relative aspect-[2/3] bg-white/5">
                {movie.poster_url ? (
                  <img 
                    src={movie.poster_url} 
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    🎬
                  </div>
                )}
                
                {/* Rating badge */}
                {movie.rating && (
                  <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-full">
                    <span className="text-yellow-400 text-xs font-bold">
                      ⭐ {parseFloat(movie.rating).toFixed(1)}
                    </span>
                  </div>
                )}
                
                {/* Actions overlay (visible on hover) */}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  {/* Move dropdown */}
                  <div className="relative group/move w-full">
                    <button
                      className="w-full px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                      disabled={isMoving === movie.id}
                    >
                      {isMoving === movie.id ? 'Moving...' : '📁 Move To'}
                    </button>
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 rounded-lg shadow-xl border border-white/20 opacity-0 invisible group-hover/move:opacity-100 group-hover/move:visible transition-all z-10">
                      {currentType !== 'watched' && (
                        <button
                          onClick={() => handleMove(movie.id, 'watched')}
                          className="w-full px-3 py-2 text-left text-white hover:bg-white/10 rounded-t-lg transition-colors text-xs"
                        >
                          🍿 Watched
                        </button>
                      )}
                      {currentType !== 'want' && (
                        <button
                          onClick={() => handleMove(movie.id, 'want')}
                          className="w-full px-3 py-2 text-left text-white hover:bg-white/10 transition-colors text-xs"
                        >
                          📌 Want to Watch
                        </button>
                      )}
                      {currentType !== 'show' && (
                        <button
                          onClick={() => handleMove(movie.id, 'show')}
                          className="w-full px-3 py-2 text-left text-white hover:bg-white/10 rounded-b-lg transition-colors text-xs"
                        >
                          📺 TV Shows
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleEdit(movie)}
                    className="w-full px-2 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  
                  <button
                    onClick={() => handleDelete(movie.id)}
                    className="w-full px-2 py-1.5 text-xs bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
                    disabled={isDeleting === movie.id}
                  >
                    {isDeleting === movie.id ? 'Deleting...' : '🗑️ Delete'}
                  </button>
                </div>
              </div>
              
              {/* Movie info */}
              <div className="p-3">
                <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
                  {movie.title}
                </h3>
                {movie.tags && (
                  <p className="text-white/60 text-xs truncate">
                    🏷️ {movie.tags}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

