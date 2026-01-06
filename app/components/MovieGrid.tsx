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
  onUpdateMovie: (movieId: string, updates: { title?: string; rating?: string; tags?: string; poster_url?: string }) => Promise<void>
  onDeleteMovie: (movieId: string) => Promise<void>
  currentType: string
  isLoading?: boolean
}

const MovieCardSkeleton = () => (
  <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden animate-pulse">
    <div className="aspect-[2/3] bg-white/10" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-white/10 rounded w-3/4" />
      <div className="h-3 bg-white/10 rounded w-1/2" />
    </div>
  </div>
)

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
  editForm: { title: string; rating: string; tags: string; poster_url: string }
  onEditFormChange: (field: string, value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  isDeleting: boolean
  isMoving: boolean
  priority?: boolean
}) => {
  if (isEditing) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 space-y-3 z-30 relative">
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
          <label className="block text-white/60 text-xs mb-1">Poster URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={editForm.poster_url || ''}
              onChange={(e) => onEditFormChange('poster_url', e.target.value)}
              className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
          </div>
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

  const year = movie.created_at ? new Date(movie.created_at).getFullYear() : '';

  return (
    <div className="group relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 transition-all duration-300 hover:shadow-2xl hover:border-white/30 hover:-translate-y-1">
      {/* Poster Image Area */}
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-t-xl bg-gray-900 cursor-pointer"
        onClick={() => onViewDetails(movie)}
      >
        <OptimizedImage
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:brightness-75"
          priority={priority}
          fallbackIcon={movie.type === 'shows' ? '📺' : '🎬'}
        />

        {/* Floating Action Menu - Appears on Hover */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-20">
          {/* Context Aware Quick Move Button */}
          {currentType === 'want' && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(movie.id, 'watched'); }}
              className="p-2 bg-green-500/80 hover:bg-green-500 text-white backdrop-blur-md rounded-xl shadow-lg transition-all hover:scale-110 active:scale-95 border border-white/20"
              title="Mark as Watched"
            >
              <span className="text-sm">👀</span>
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onEdit(movie); }}
            className="p-2 bg-white/20 hover:bg-blue-600 text-white backdrop-blur-md rounded-xl shadow-lg transition-all hover:scale-110 active:scale-95 border border-white/20"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>

          <div className="relative group/move">
            <button
              className="p-2 bg-white/20 hover:bg-purple-600 text-white backdrop-blur-md rounded-xl shadow-lg transition-all hover:scale-110 active:scale-95 border border-white/20"
              title="Move to..."
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </button>
            {/* Dropdown for Move */}
            <div className="absolute right-full top-0 mr-2 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl opacity-0 invisible group-hover/move:opacity-100 group-hover/move:visible transition-all w-32">
              {currentType !== 'watched' && (
                <button onClick={(e) => { e.stopPropagation(); onMove(movie.id, 'watched'); }} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10">🍿 Watched</button>
              )}
              {currentType !== 'want' && (
                <button onClick={(e) => { e.stopPropagation(); onMove(movie.id, 'want'); }} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10">📌 Want</button>
              )}
              {currentType !== 'show' && (
                <button onClick={(e) => { e.stopPropagation(); onMove(movie.id, 'show'); }} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10">📺 TV</button>
              )}
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(movie.id); }}
            className="p-2 bg-white/20 hover:bg-red-600 text-white backdrop-blur-md rounded-xl shadow-lg transition-all hover:scale-110 active:scale-95 border border-white/20"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>

        {/* Rating Badge (Always Visible) */}
        {movie.rating && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-white text-xs font-bold">{movie.rating}</span>
          </div>
        )}
      </div>

      {/* Info Content */}
      <div className="p-3" onClick={() => onViewDetails(movie)}>
        <h3 className="text-white font-bold text-sm leading-tight mb-1 line-clamp-1 group-hover:text-blue-200 transition-colors">
          {movie.title}
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex gap-1 overflow-hidden">
            {movie.tags?.split(',').slice(0, 2).map((tag, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/60 whitespace-nowrap">
                {tag.trim()}
              </span>
            ))}
          </div>
          {year && (
            <span className="text-[10px] text-white/40 font-mono">{year}</span>
          )}
        </div>
      </div>
    </div>
  )
})

MovieCard.displayName = 'MovieCard'

export default function MovieGrid({ movies, onMoveMovie, onUpdateMovie, onDeleteMovie, currentType, isLoading }: MovieGridProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', rating: '', tags: '', poster_url: '' })
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState<string | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const handleEdit = (movie: Movie) => {
    setEditingId(movie.id)
    setEditForm({
      title: movie.title,
      rating: movie.rating || '',
      tags: movie.tags || '',
      poster_url: movie.poster_url || ''
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
    setEditForm({ title: '', rating: '', tags: '', poster_url: '' })
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

  const handleOverviewFetched = async (movieId: string, overview: string, posterUrl?: string, forceUpdate = false, providers?: any) => {
    try {
      const updates: any = { overview }
      if (posterUrl && (forceUpdate || !selectedMovie?.poster_url)) {
        updates.poster_url = posterUrl
      }
      if (providers) {
        updates.providers = providers
      }
      if (selectedMovie) {
        setSelectedMovie({
          ...selectedMovie,
          ...updates,
          poster_url: updates.poster_url || selectedMovie.poster_url
        })
      }
      await onUpdateMovie(movieId, updates)
    } catch (error) {
      console.error('Failed to save fetched overview:', error)
    }
  }

  return (
    <>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 text-3xl">
            🎬
          </div>
          <h3 className="text-white text-xl font-bold mb-2">No movies found</h3>
          <p className="text-white/60 text-center max-w-sm mb-6">
            {currentType === 'watched' ? "You haven't watched any movies yet." :
              currentType === 'want' ? "Your watchlist is empty." :
                "No TV shows in your list."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-20">
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
              priority={index < 6}
            />
          ))}
        </div>
      )}

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
