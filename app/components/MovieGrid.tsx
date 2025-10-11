'use client'

import { useState, memo } from 'react'
import OptimizedImage from './OptimizedImage'
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

interface MovieGridProps {
  movies: Movie[]
  onMoveMovie: (movieId: string, newType: string) => Promise<void>
  onUpdateMovie: (movieId: string, updates: { title?: string; rating?: string; tags?: string }) => Promise<void>
  onDeleteMovie: (movieId: string) => Promise<void>
  currentType: string
}

// Memoize individual movie card for better performance
const MovieCard = memo(({ 
  movie, 
  onMove, 
  onEdit, 
  onDelete, 
  onViewDetails,
  currentType,
  isEditing,
  editForm,
  onEditFormChange,
  onSaveEdit,
  onCancelEdit,
  isDeleting,
  isMoving,
  priority
}: {
  movie: Movie
  onMove: (movieId: string, newType: string) => void
  onEdit: (movie: Movie) => void
  onDelete: (movieId: string) => void
  onViewDetails: (movie: Movie) => void
  currentType: string
  isEditing: boolean
  editForm: { title: string; rating: string; tags: string }
  onEditFormChange: (field: string, value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  isDeleting: boolean
  isMoving: boolean
  priority?: boolean
}) => {
  if (isEditing) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 space-y-3">
        <div>
          <label className="block text-white/60 text-xs mb-1">Title</label>
          <input
            type="text"
            value={editForm.title}
            onChange={(e) => onEditFormChange('title', e.target.value)}
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Title"
          />
        </div>
        <div>
          <label className="block text-white/60 text-xs mb-1">Rating</label>
          <StarRating
            rating={editForm.rating}
            onChange={(newRating) => onEditFormChange('rating', newRating)}
            size="sm"
          />
        </div>
        <div>
          <label className="block text-white/60 text-xs mb-1">Tags</label>
          <input
            type="text"
            value={editForm.tags}
            onChange={(e) => onEditFormChange('tags', e.target.value)}
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tags"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancelEdit}
            className="flex-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSaveEdit}
            className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-white/30">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-all duration-300 pointer-events-none rounded-xl"></div>
      
      {/* Poster */}
      <div 
        className="relative aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 rounded-t-xl overflow-visible cursor-pointer"
        onClick={() => onViewDetails(movie)}
        title="Click to view details"
      >
        <div className="absolute inset-0 overflow-hidden rounded-t-xl">
          <OptimizedImage
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            priority={priority}
          />
        </div>
        
        {/* Rating badge */}
        {movie.rating && (
          <div className="absolute top-3 right-3 bg-gradient-to-br from-yellow-400 to-orange-500 px-3 py-1.5 rounded-full shadow-lg transform transition-all duration-300 group-hover:scale-110 z-10">
            <span className="text-white text-xs font-black flex items-center gap-1">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {parseFloat(movie.rating).toFixed(1)}
            </span>
          </div>
        )}
        
        {/* Actions overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 z-20">
          <div className="relative group/move">
            <button
              className="w-10 h-10 bg-blue-600/90 hover:bg-blue-600 backdrop-blur-sm text-white rounded-full transition-all disabled:opacity-50 flex items-center justify-center shadow-lg hover:scale-110 transform"
              disabled={isMoving}
              title="Move to another list"
              aria-label="Move to another list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-900 rounded-lg shadow-xl border border-white/20 opacity-0 invisible group-hover/move:opacity-100 group-hover/move:visible transition-all z-50 min-w-max pointer-events-none group-hover/move:pointer-events-auto">
              {currentType !== 'watched' && (
                <button
                  onClick={() => onMove(movie.id, 'watched')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-t-lg transition-colors text-sm whitespace-nowrap"
                  aria-label="Move to Watched"
                >
                  🍿 Watched
                </button>
              )}
              {currentType !== 'want' && (
                <button
                  onClick={() => onMove(movie.id, 'want')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors text-sm whitespace-nowrap"
                  aria-label="Move to Want to Watch"
                >
                  📌 Want to Watch
                </button>
              )}
              {currentType !== 'show' && (
                <button
                  onClick={() => onMove(movie.id, 'show')}
                  className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-b-lg transition-colors text-sm whitespace-nowrap"
                  aria-label="Move to TV Shows"
                >
                  📺 TV Shows
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={() => onEdit(movie)}
            className="w-10 h-10 bg-purple-600/90 hover:bg-purple-600 backdrop-blur-sm text-white rounded-full transition-all flex items-center justify-center shadow-lg hover:scale-110 transform"
            title="Edit movie"
            aria-label={`Edit ${movie.title}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => onDelete(movie.id)}
            className="w-10 h-10 bg-red-600/90 hover:bg-red-600 backdrop-blur-sm text-white rounded-full transition-all disabled:opacity-50 flex items-center justify-center shadow-lg hover:scale-110 transform"
            disabled={isDeleting}
            title="Delete movie"
            aria-label={`Delete ${movie.title}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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
    </div>
  )
})

MovieCard.displayName = 'MovieCard'

export default function MovieGrid({ movies, onMoveMovie, onUpdateMovie, onDeleteMovie, currentType }: MovieGridProps) {
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

  const handleSaveEdit = async () => {
    if (!editingId) return
    try {
      await onUpdateMovie(editingId, editForm)
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

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.map((movie, index) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onMove={handleMove}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            currentType={currentType}
            isEditing={editingId === movie.id}
            editForm={editForm}
            onEditFormChange={handleEditFormChange}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            isDeleting={isDeleting === movie.id}
            isMoving={isMoving === movie.id}
            priority={index < 6} // Prioritize first 6 visible images
          />
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

