'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

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

interface MovieDetailsModalProps {
  movie: Movie | null
  isOpen: boolean
  onClose: () => void
  onOverviewFetched?: (movieId: string, overview: string, posterUrl?: string) => void
}

export default function MovieDetailsModal({ movie, isOpen, onClose, onOverviewFetched }: MovieDetailsModalProps) {
  const [fetchedOverview, setFetchedOverview] = useState<string | null>(null)
  const [fetchedCast, setFetchedCast] = useState<string[] | null>(null)
  const [isLoadingOverview, setIsLoadingOverview] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [fetchSource, setFetchSource] = useState<string | null>(null)

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Fetch overview and cast if missing
  useEffect(() => {
    if (!isOpen || !movie) {
      setFetchedOverview(null)
      setFetchedCast(null)
      setFetchError(false)
      setFetchSource(null)
      return
    }

    // If overview already exists, don't fetch
    if (movie.overview) {
      return
    }

    // Fetch overview and cast from API
    const fetchDetails = async () => {
      setIsLoadingOverview(true)
      setFetchError(false)
      
      try {
        const response = await fetch(
          `/api/movies/fetch-details?title=${encodeURIComponent(movie.title)}&type=${movie.type}`
        )
        const data = await response.json()

        if (data.found) {
          if (data.data.overview) {
            setFetchedOverview(data.data.overview)
          }
          if (data.data.cast && data.data.cast.length > 0) {
            setFetchedCast(data.data.cast)
          }
          setFetchSource(data.source)
          
          // Optionally call the callback to update the database
          if (onOverviewFetched && data.data.overview) {
            onOverviewFetched(movie.id, data.data.overview, data.data.poster)
          }
        } else {
          setFetchError(true)
        }
      } catch (error) {
        console.error('Failed to fetch details:', error)
        setFetchError(true)
      } finally {
        setIsLoadingOverview(false)
      }
    }

    fetchDetails()
  }, [isOpen, movie, onOverviewFetched])

  if (!isOpen || !movie) return null

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'watched': return '🍿 Watched'
      case 'want': return '📌 Want to Watch'
      case 'show': return '📺 TV Show'
      default: return type
    }
  }

  // Use portal to render modal at document root to avoid z-index stacking issues
  if (typeof window === 'undefined') return null

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/20 animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header with close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-full transition-all flex items-center justify-center group"
            aria-label="Close"
          >
            <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[90vh]">
          {/* Movie poster and basic info section */}
          <div className="relative">
            {/* Backdrop blur effect */}
            {movie.poster_url && (
              <div 
                className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30"
                style={{ backgroundImage: `url(${movie.poster_url})` }}
              />
            )}
            
            <div className="relative flex flex-col md:flex-row gap-6 p-6 md:p-8">
              {/* Poster */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                {movie.poster_url ? (
                  <img 
                    src={movie.poster_url} 
                    alt={movie.title}
                    className="w-48 md:w-64 rounded-xl shadow-2xl border-4 border-white/10"
                  />
                ) : (
                  <div className="w-48 md:w-64 h-72 md:h-96 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center text-6xl shadow-2xl border-4 border-white/10">
                    🎬
                  </div>
                )}
              </div>

              {/* Movie info */}
              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 break-words">
                    {movie.title}
                  </h2>
                  <div className="flex flex-wrap gap-3 items-center">
                    <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-semibold border border-blue-500/30">
                      {getTypeLabel(movie.type)}
                    </span>
                    {movie.rating && (
                      <span className="inline-flex items-center gap-1.5 bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-bold border border-yellow-500/30">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {parseFloat(movie.rating).toFixed(1)} / 10.0
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {movie.tags && (
                  <div className="flex flex-wrap gap-2">
                    {movie.tags.split(',').map((tag, index) => (
                      <span 
                        key={index}
                        className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-medium border border-purple-500/30"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Cast */}
                {fetchedCast && fetchedCast.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                    <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Cast
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {fetchedCast.map((actor, index) => (
                        <span 
                          key={index}
                          className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/30"
                        >
                          {actor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overview/Synopsis */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                  <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Synopsis
                  </h3>
                  
                  {(movie.overview || fetchedOverview) ? (
                    <p className="text-white/80 leading-relaxed text-sm md:text-base">
                      {movie.overview || fetchedOverview}
                    </p>
                  ) : isLoadingOverview ? (
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Fetching synopsis from movie database...
                    </div>
                  ) : fetchError ? (
                    <p className="text-white/50 italic text-sm">
                      No synopsis available for this title.
                    </p>
                  ) : null}
                </div>

                {/* Added date */}
                {movie.created_at && (
                  <div className="text-white/40 text-xs">
                    Added {new Date(movie.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer with action hint */}
          <div className="bg-black/30 px-6 py-4 border-t border-white/10">
            <p className="text-white/50 text-sm text-center">
              Press <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">ESC</kbd> or click outside to close
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

