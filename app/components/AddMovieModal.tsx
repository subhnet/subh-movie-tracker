'use client'

import { useState, useEffect, useRef } from 'react'

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
}

export default function AddMovieModal({ isOpen, onClose, onAdd, defaultType = 'watched' }: AddMovieModalProps) {
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
    }, 500) // Debounce for 500ms

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-sm rounded-lg shadow-2xl max-w-md w-full p-6 border border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Add Movie</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-2xl leading-none"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="relative">
            <label htmlFor="title" className="block text-white font-medium mb-2">
              Title *
            </label>
            <div className="relative">
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start typing to search..."
                disabled={isSubmitting}
                required
                autoComplete="off"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 rounded-lg shadow-2xl border border-white/20 max-h-80 overflow-y-auto z-10">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full p-3 hover:bg-white/10 transition-colors text-left flex gap-3 items-start border-b border-white/5 last:border-0"
                  >
                    {suggestion.posterSmall ? (
                      <img 
                        src={suggestion.posterSmall} 
                        alt={suggestion.title}
                        className="w-12 h-16 object-cover rounded flex-shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-white/5 rounded flex items-center justify-center flex-shrink-0 text-2xl">
                        🎬
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {suggestion.title}
                        {suggestion.year && (
                          <span className="text-white/60 ml-2">({suggestion.year})</span>
                        )}
                      </div>
                      {suggestion.rating && (
                        <div className="text-sm text-yellow-400 mt-1">
                          ⭐ {suggestion.rating}/5.0
                        </div>
                      )}
                      {suggestion.overview && (
                        <div className="text-xs text-white/50 mt-1 line-clamp-2">
                          {suggestion.overview}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="type" className="block text-white font-medium mb-2">
              List *
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                // Clear suggestions when type changes to trigger new search
                setSuggestions([])
                setShowSuggestions(false)
              }}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              required
            >
              <option value="watched" className="bg-gray-900">Watched Movies</option>
              <option value="want" className="bg-gray-900">Want to Watch</option>
              <option value="show" className="bg-gray-900">TV Shows</option>
            </select>
            <p className="text-xs text-white/50 mt-1">
              {type === 'show' ? '📺 Searching TV shows' : '🎬 Searching movies'}
            </p>
          </div>

          <div>
            <label htmlFor="rating" className="block text-white font-medium mb-2">
              Rating (0-10)
            </label>
            <input
              id="rating"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional rating"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-white font-medium mb-2">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., action, comedy"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Movie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

