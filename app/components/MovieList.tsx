'use client'

import { useState } from 'react'
import StarRating from './StarRating'

interface Movie {
  id: string
  title: string
  rating: string
  tags: string
  type: string
  poster_url?: string | null
  created_at?: string
}

interface MovieListProps {
  movies: Movie[]
  onMoveMovie: (movieId: string, newType: string) => Promise<void>
  onUpdateMovie: (movieId: string, updates: { title?: string; rating?: string; tags?: string }) => Promise<void>
  onDeleteMovie: (movieId: string) => Promise<void>
  currentType: string
}

export default function MovieList({ movies, onMoveMovie, onUpdateMovie, onDeleteMovie, currentType }: MovieListProps) {
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'watched': return 'Watched'
      case 'want': return 'Want to Watch'
      case 'show': return 'TV Shows'
      default: return type
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'watched': return '🍿'
      case 'want': return '📌'
      case 'show': return '📺'
      default: return '🎬'
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
    <div className="space-y-3">
      {movies.map((movie) => (
        <div
          key={movie.id}
          className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-colors"
        >
          {editingId === movie.id ? (
            // Edit mode
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Title"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Rating</label>
                <StarRating
                  rating={editForm.rating}
                  onChange={(newRating) => setEditForm({ ...editForm, rating: newRating })}
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Tags</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tags (comma separated)"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveEdit(movie.id)}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            // View mode
            <div className="flex items-start justify-between gap-4">
              {/* Poster thumbnail */}
              {movie.poster_url ? (
                <img 
                  src={movie.poster_url} 
                  alt={movie.title}
                  className="w-16 h-24 object-cover rounded flex-shrink-0 shadow-lg"
                  loading="lazy"
                />
              ) : (
                <div className="w-16 h-24 bg-white/5 rounded flex items-center justify-center flex-shrink-0 text-3xl">
                  🎬
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-lg mb-1 truncate">
                  {movie.title}
                </h3>
                <div className="flex flex-wrap gap-3 text-sm text-white/70">
                  {movie.rating && (
                    <span className="flex items-center gap-1">
                      ⭐ {parseFloat(movie.rating).toFixed(1)}
                    </span>
                  )}
                  {movie.tags && (
                    <span className="flex items-center gap-1">
                      🏷️ {movie.tags}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 flex-shrink-0">
                {/* Move dropdown */}
                <div className="relative group">
                  <button
                    className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded transition-colors disabled:opacity-50"
                    disabled={isMoving === movie.id}
                  >
                    {isMoving === movie.id ? '...' : '📁 Move'}
                  </button>
                  <div className="absolute right-0 mt-1 w-40 bg-gray-900 rounded-lg shadow-xl border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    {currentType !== 'watched' && (
                      <button
                        onClick={() => handleMove(movie.id, 'watched')}
                        className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-t-lg transition-colors text-sm"
                      >
                        🍿 Watched
                      </button>
                    )}
                    {currentType !== 'want' && (
                      <button
                        onClick={() => handleMove(movie.id, 'want')}
                        className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors text-sm"
                      >
                        📌 Want to Watch
                      </button>
                    )}
                    {currentType !== 'show' && (
                      <button
                        onClick={() => handleMove(movie.id, 'show')}
                        className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-b-lg transition-colors text-sm"
                      >
                        📺 TV Shows
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleEdit(movie)}
                  className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                >
                  ✏️ Edit
                </button>
                
                <button
                  onClick={() => handleDelete(movie.id)}
                  className="px-3 py-1 text-sm bg-red-600/20 hover:bg-red-600/40 text-red-200 rounded transition-colors disabled:opacity-50"
                  disabled={isDeleting === movie.id}
                >
                  {isDeleting === movie.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

