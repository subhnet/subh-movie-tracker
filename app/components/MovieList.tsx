'use client'

import { useState } from 'react'
import StarRating from './StarRating'
import MovieDetailsModal from './MovieDetailsModal'

interface Movie {
  id: string
  title: string
  rating: string
  tags: string
  type: string
  poster_url?: string | null
  overview?: string | null
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
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

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

  const handleViewDetails = (movie: Movie) => {
    setSelectedMovie(movie)
    setIsDetailsModalOpen(true)
  }

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false)
    setSelectedMovie(null)
  }

  const handleOverviewFetched = async (movieId: string, overview: string, posterUrl?: string) => {
    try {
      // Update the movie in the database with the fetched overview
      const updates: any = { overview }
      if (posterUrl && !selectedMovie?.poster_url) {
        updates.poster_url = posterUrl
      }
      
      await onUpdateMovie(movieId, updates)
    } catch (error) {
      console.error('Failed to save fetched overview:', error)
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
    <>
      <div className="space-y-3">
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="group relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-white/30"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300 pointer-events-none rounded-xl"></div>
            <div className="relative">
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
              <div 
                className="relative flex-shrink-0 overflow-hidden rounded-lg cursor-pointer"
                onClick={() => handleViewDetails(movie)}
                title="Click to view details"
              >
                {movie.poster_url ? (
                  <img 
                    src={movie.poster_url} 
                    alt={movie.title}
                    className="w-16 h-24 object-cover shadow-lg transform transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-16 h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded flex items-center justify-center text-3xl transform transition-transform duration-300 group-hover:scale-110">
                    🎬
                  </div>
                )}
                <div className="absolute inset-0 ring-2 ring-white/0 group-hover:ring-white/20 transition-all duration-300 rounded-lg"></div>
              </div>
              
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
                    className="w-9 h-9 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center shadow-md hover:scale-105 transform"
                    disabled={isMoving === movie.id}
                    title="Move to another list"
                    aria-label="Move to another list"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-1 w-44 bg-gray-900 rounded-lg shadow-xl border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    {currentType !== 'watched' && (
                      <button
                        onClick={() => handleMove(movie.id, 'watched')}
                        className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-t-lg transition-colors text-sm"
                        aria-label="Move to Watched"
                      >
                        🍿 Watched
                      </button>
                    )}
                    {currentType !== 'want' && (
                      <button
                        onClick={() => handleMove(movie.id, 'want')}
                        className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors text-sm"
                        aria-label="Move to Want to Watch"
                      >
                        📌 Want to Watch
                      </button>
                    )}
                    {currentType !== 'show' && (
                      <button
                        onClick={() => handleMove(movie.id, 'show')}
                        className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-b-lg transition-colors text-sm"
                        aria-label="Move to TV Shows"
                      >
                        📺 TV Shows
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleEdit(movie)}
                  className="w-9 h-9 bg-purple-600/90 hover:bg-purple-600 text-white rounded-lg transition-all flex items-center justify-center shadow-md hover:scale-105 transform"
                  title="Edit movie"
                  aria-label={`Edit ${movie.title}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleDelete(movie.id)}
                  className="w-9 h-9 bg-red-600/90 hover:bg-red-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center shadow-md hover:scale-105 transform"
                  disabled={isDeleting === movie.id}
                  title="Delete movie"
                  aria-label={`Delete ${movie.title}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      ))}
    </div>

    {/* Movie Details Modal */}
    <MovieDetailsModal 
      movie={selectedMovie}
      isOpen={isDetailsModalOpen}
      onClose={handleCloseDetailsModal}
      onOverviewFetched={handleOverviewFetched}
      onMoveMovie={handleMove}
    />
    </>
  )
}

