'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  onAdd: (movieData: { title: string; rating: string; tags: string; type: string; posterUrl?: string; overview?: string }) => Promise<void>
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
  const [selectedOverview, setSelectedOverview] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tagsInputRef = useRef<HTMLInputElement>(null)
  const justSelectedRef = useRef(false) // Use ref instead of state for immediate updates
  const previousTitleRef = useRef('') // Track previous title to detect actual changes

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setRating('')
      setTags('')
      setType(defaultType)
      setSelectedPoster(null)
      setSelectedOverview(null)
      setSuggestions([])
      setShowSuggestions(false)
      justSelectedRef.current = false
      previousTitleRef.current = ''
      setIsSearching(false)
      setError('')
      setDuplicateWarning(null)

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    } else {
      // Sync type with defaultType when opening
      setType(defaultType)
    }
  }, [isOpen, defaultType])

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
        : duplicate.type === 'want' ? 'Watchlist'
          : 'TV Shows'
      setDuplicateWarning(`"${duplicate.title}" already exists in ${listName}`)
    } else {
      setDuplicateWarning(null)
    }
  }, [title, existingMovies])

  // Search for movie suggestions
  useEffect(() => {
    // Don't search if user just selected a suggestion (check ref immediately)
    if (justSelectedRef.current) {
      return
    }

    // Only search if title actually changed (not just type dropdown)
    if (title === previousTitleRef.current) {
      return
    }

    previousTitleRef.current = title

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (title.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      // Double-check ref before making the API call
      if (justSelectedRef.current) {
        setIsSearching(false)
        return
      }

      try {
        const searchType = type === 'show' ? 'tv' : 'movie'
        const response = await fetch(`/api/search-movies?query=${encodeURIComponent(title)}&type=${searchType}`)
        const data = await response.json()

        // Triple-check ref after receiving results to ensure we don't show stale results after selection
        if (data.results && !justSelectedRef.current) {
          setSuggestions(data.results)
          setShowSuggestions(data.results.length > 0)
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
      } finally {
        setIsSearching(false)
      }
    }, 800)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [title, type])

  const handleSelectSuggestion = (suggestion: MovieSuggestion) => {
    // 1. Set flag to lock out any pending/upcoming searches
    justSelectedRef.current = true

    // 2. Clear timeout immediately
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // 3. Reset search state
    setIsSearching(false)
    setSuggestions([])
    setShowSuggestions(false)

    // 4. Update data state
    setTitle(suggestion.title)
    previousTitleRef.current = suggestion.title // Sync ref effectively "skipping" the change detection
    setRating(suggestion.rating || '')
    setSelectedPoster(suggestion.poster)
    setSelectedOverview(suggestion.overview || null)

    // 5. Move focus (improve accessibility/UX)
    if (tagsInputRef.current) {
      tagsInputRef.current.focus()
    }

    // 6. Reset flag after delay
    setTimeout(() => {
      justSelectedRef.current = false
    }, 1000)
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
        posterUrl: selectedPoster || undefined,
        overview: selectedOverview || undefined
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add movie')
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  // Use portal to render modal at document root
  if (typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ zIndex: 9999 }}>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 animate-in slide-in-from-bottom-4 duration-300">
        <div className="sticky top-0 bg-gray-900/50 px-6 py-4 flex justify-between items-center border-b border-white/10 backdrop-blur-xl z-20">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add to Collection
            </h2>
            <p className="text-white/60 text-sm mt-1">Search and add movies or TV shows</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10 transition-all w-8 h-8 rounded-lg flex items-center justify-center"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {duplicateWarning && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{duplicateWarning}</span>
              </div>
            )}

            {/* Type Selection (Segmented Control) */}
            <div className="grid grid-cols-3 gap-2 bg-black/20 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('watched')
                  setSuggestions([])
                  setShowSuggestions(false)
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${type === 'watched'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
              >
                🍿 Watched
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('want')
                  setSuggestions([])
                  setShowSuggestions(false)
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${type === 'want'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
              >
                📌 Watchlist
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('show')
                  setSuggestions([])
                  setShowSuggestions(false)
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${type === 'show'
                    ? 'bg-pink-600 text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
              >
                📺 TV Shows
              </button>
            </div>

            <div className="relative">
              <label htmlFor="title" className="block text-white/80 font-medium mb-2 text-sm">
                Search {type === 'show' ? 'TV Show' : 'Movie'} *
              </label>
              <div className="relative group">
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => !justSelectedRef.current && suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg"
                  placeholder={type === 'show' ? "Type show name..." : "Type movie name..."}
                  disabled={isSubmitting}
                  required
                  autoComplete="off"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 rounded-xl shadow-2xl border border-white/10 max-h-[400px] overflow-y-auto z-30 animate-in slide-in-from-top-2 duration-200 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {suggestions.map((suggestion) => {
                    const normalizedSuggestionTitle = suggestion.title.toLowerCase()
                    const existsIn = existingMovies.find(
                      movie => movie.title.toLowerCase() === normalizedSuggestionTitle
                    )

                    return (
                      <button
                        key={suggestion.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault() // Prevent blur event
                          handleSelectSuggestion(suggestion)
                        }}
                        className={`w-full p-3 hover:bg-white/5 transition-all text-left flex gap-4 items-start border-b border-white/5 last:border-0 group ${existsIn ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : ''}`}
                      >
                        {suggestion.posterSmall ? (
                          <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                            <img
                              src={suggestion.posterSmall}
                              alt={suggestion.title}
                              className="w-12 h-18 object-cover rounded-lg shadow-black/50 shadow-lg"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-18 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl border border-white/10">
                            🎬
                          </div>
                        )}
                        <div className="flex-1 min-w-0 py-1">
                          <div className="font-medium text-white truncate flex items-center gap-2 flex-wrap">
                            <span className="group-hover:text-blue-400 transition-colors">{suggestion.title}</span>
                            {suggestion.year && (
                              <span className="text-white/40 text-xs font-normal border border-white/10 px-1.5 py-0.5 rounded">{suggestion.year}</span>
                            )}
                          </div>

                          {existsIn && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-300 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/30 uppercase tracking-wide font-bold">
                                Already in {existsIn.type === 'watched' ? 'Watched' : existsIn.type === 'want' ? 'Watchlist' : 'Shows'}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-1.5">
                            {suggestion.rating && !isNaN(parseFloat(suggestion.rating)) && (
                              <span className="flex items-center gap-1 text-xs text-yellow-500 font-medium bg-yellow-500/10 px-1.5 py-0.5 rounded">
                                ⭐ {parseFloat(suggestion.rating).toFixed(1)}
                              </span>
                            )}
                            <span className="text-xs text-white/30 capitalize">{suggestion.mediaType}</span>
                          </div>

                          {suggestion.overview && (
                            <p className="text-xs text-white/50 mt-1.5 line-clamp-2 leading-relaxed font-light">
                              {suggestion.overview}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="tags" className="block text-white/80 font-medium mb-2 text-sm">
                Tags
              </label>
              <div className="relative text-white/50 text-xs mb-1.5 italic absolute right-0 top-0">
                Optional
              </div>
              <input
                id="tags"
                ref={tagsInputRef}
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g. sci-fi, mind-bending, 2024"
                disabled={isSubmitting}
              />
            </div>

            {/* Rating Section - Only for Watched */}
            <div className={`overflow-hidden transition-all duration-300 ${type === 'watched' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <label className="block text-white/80 font-medium mb-3 text-sm">
                  Your Rating
                </label>
                <div className="flex items-center gap-4">
                  <StarRating
                    rating={rating}
                    onChange={setRating}
                    disabled={isSubmitting}
                    size="md"
                  />
                  <span className="text-white/40 text-sm font-medium">
                    {rating ? `${rating}/10` : 'No rating'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-medium text-sm flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 flex-[2] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <span>Add to Collection</span>
                    <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
