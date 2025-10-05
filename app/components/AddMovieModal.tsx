'use client'

import { useState, useEffect, useRef } from 'react'
import StarRating from './StarRating'

interface MovieSuggestion {
  id: number
  title: string
  year: number | null
  posterSmall: string | null
  poster: string | null
  posterLarge: string | null
  overview: string
  rating: string | null
  mediaType: string
}

interface AddMovieModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (movieData: { title: string; rating: string; tags: string; type: string; posterUrl?: string }) => Promise<void>
  defaultType?: string
  existingMovies?: Array<{ title: string; type: string }>
}

export default function AddMovieModal({ isOpen, onClose, onAdd, defaultType = 'watched', existingMovies = [] }: AddMovieModalProps) {
  const [title, setTitle] = useState('')
  const [rating, setRating] = useState('')
  const [tags, setTags] = useState('')
  const [type, setType] = useState(defaultType)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check for duplicates whenever title changes
  useEffect(() => {
    if (title.trim().length < 2) {
      setDuplicateWarning(null)
      return
    }

    const normalizedTitle = title.trim().toLowerCase()
    const duplicate = existingMovies.find(
      movie => movie.title.toLowerCase() === normalizedTitle
    )

    if (duplicate) {
      const listName = duplicate.type === 'watched' ? 'Watched Movies' 
                     : duplicate.type === 'want' ? 'Want to Watch' 
                     : 'TV Shows'
      setDuplicateWarning(`"${duplicate.title}" already exists in ${listName}`)
    } else {
      setDuplicateWarning(null)
    }
  }, [title, existingMovies])

  // Search for movie suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (title.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchType = type === 'show' ? 'tv' : 'movie'
        const response = await fetch(`/api/search-movies?query=${encodeURIComponent(title)}&type=${searchType}`)
        const data = await response.json()
        
        if (data.results) {
          setSuggestions(data.results)
          setShowSuggestions(data.results.length > 0)
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
      } finally {
        setIsSearching(false)
      }
    }, 800) // Debounce for 800ms (reduces API calls)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [title, type])

  const handleSelectSuggestion = (suggestion: MovieSuggestion) => {
    setTitle(suggestion.title)
    setRating(suggestion.rating || '')
    // Save the medium-sized poster (w185) for storage
    setSelectedPoster(suggestion.poster)
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onAdd({ 
        title: title.trim(), 
        rating, 
        tags, 
        type,
        posterUrl: selectedPoster || undefined
      })
      // Reset form
      setTitle('')
      setRating('')
      setTags('')
      setType(defaultType)
      setSelectedPoster(null)
      setSuggestions([])
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add movie')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/40 animate-in slide-in-from-bottom-4 duration-300">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 flex justify-between items-center border-b border-white/20 backdrop-blur-xl">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add to Collection
            </h2>
            <p className="text-white/80 text-sm mt-1">Search and add movies or TV shows</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 transition-all text-2xl leading-none w-10 h-10 rounded-full flex items-center justify-center"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="p-6">

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 px-4 py-3 rounded flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{duplicateWarning}</span>
            </div>
          )}

          <div className="relative">
            <label htmlFor="title" className="block text-gray-700 font-semibold mb-2 text-sm">
              Search Movie or TV Show *
            </label>
            <div className="relative">
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="Start typing to search..."
                disabled={isSubmitting}
                required
                autoComplete="off"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto z-10 animate-in slide-in-from-top-2 duration-200">
                {suggestions.map((suggestion) => {
                  const normalizedSuggestionTitle = suggestion.title.toLowerCase()
                  const existsIn = existingMovies.find(
                    movie => movie.title.toLowerCase() === normalizedSuggestionTitle
                  )
                  
                  return (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`w-full p-4 hover:bg-blue-50 transition-all text-left flex gap-4 items-start border-b border-gray-100 last:border-0 ${existsIn ? 'bg-yellow-50' : ''}`}
                    >
                      {suggestion.posterSmall ? (
                        <img 
                          src={suggestion.posterSmall} 
                          alt={suggestion.title}
                          className="w-14 h-20 object-cover rounded-lg shadow-md flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-14 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-3xl">
                          🎬
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate flex items-center gap-2 flex-wrap">
                          <span>{suggestion.title}</span>
                          {suggestion.year && (
                            <span className="text-gray-500 text-sm">({suggestion.year})</span>
                          )}
                          {existsIn && (
                            <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-700 text-xs px-2 py-1 rounded-full border border-yellow-500/30 font-semibold">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              In {existsIn.type === 'watched' ? 'Watched' : existsIn.type === 'want' ? 'Watchlist' : 'Shows'}
                            </span>
                          )}
                        </div>
                        {suggestion.rating && (
                          <div className="flex items-center gap-1 text-sm text-yellow-600 mt-1">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {suggestion.rating}/5.0
                          </div>
                        )}
                        {suggestion.overview && (
                          <div className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                            {suggestion.overview}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-gray-700 font-semibold mb-2 text-sm">
                Add to List *
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value)
                  setSuggestions([])
                  setShowSuggestions(false)
                }}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                disabled={isSubmitting}
                required
              >
                <option value="want" className="py-2">📌 Want to Watch</option>
                <option value="watched" className="py-2">🎬 Watched Movies</option>
                <option value="show" className="py-2">📺 TV Shows</option>
              </select>
            </div>

            <div>
              <label htmlFor="tags" className="block text-gray-700 font-semibold mb-2 text-sm">
                Tags (Optional)
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="action, comedy, thriller"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <label className="block text-gray-700 font-semibold mb-3 text-sm">
              Rating (Optional)
            </label>
            <StarRating
              rating={rating}
              onChange={setRating}
              disabled={isSubmitting}
              size="md"
            />
            <p className="text-xs text-gray-500 mt-2">
              Click a star to rate • Click between stars for half ratings
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all font-semibold"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add to Collection
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}

