'use client'

import { useState, useEffect } from 'react'
import StarRating from './StarRating'

interface MovieSuggestion {
  title: string
  year?: string
  type?: string
  posterSmall?: string
  poster?: string
  posterLarge?: string
}

interface QuickAddProps {
  onAdd: (title: string, type: string, rating: string, posterUrl?: string) => Promise<void>
  existingMovies?: Array<{ title: string; type: string }>
}

export default function QuickAdd({ onAdd, existingMovies = [] }: QuickAddProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<MovieSuggestion | null>(null)
  const [listType, setListType] = useState<'want' | 'watched' | 'show'>('want')
  const [rating, setRating] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null)
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false)

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([])
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search-movies?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.results || [])
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Get AI recommendation based on user's collection
  const getAiRecommendation = async () => {
    if (existingMovies.length === 0) return

    setIsLoadingRecommendation(true)
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movies: existingMovies.slice(0, 10).map(m => m.title),
          count: 1
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.recommendations && data.recommendations.length > 0) {
          setAiRecommendation(data.recommendations[0].title)
        }
      }
    } catch (error) {
      console.error('Failed to get recommendation:', error)
    } finally {
      setIsLoadingRecommendation(false)
    }
  }

  const handleSelectMovie = (movie: MovieSuggestion) => {
    setSelectedMovie(movie)
    setSearchQuery(movie.title)
    setSuggestions([])
  }

  const handleQuickAdd = async () => {
    if (!selectedMovie) return

    setIsAdding(true)
    try {
      await onAdd(
        selectedMovie.title,
        listType,
        rating,
        selectedMovie.poster || selectedMovie.posterSmall
      )
      
      // Reset form
      setSearchQuery('')
      setSelectedMovie(null)
      setRating('')
      
      // Get next recommendation
      await getAiRecommendation()
    } catch (error) {
      console.error('Failed to add movie:', error)
      alert('Failed to add movie')
    } finally {
      setIsAdding(false)
    }
  }

  const handleUseRecommendation = () => {
    if (aiRecommendation) {
      setSearchQuery(aiRecommendation)
      setAiRecommendation(null)
    }
  }

  const checkIfExists = (title: string) => {
    return existingMovies.some(m => 
      m.title.toLowerCase() === title.toLowerCase()
    )
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          if (existingMovies.length > 0) {
            getAiRecommendation()
          }
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-40 group"
        title="Quick Add Movie"
        aria-label="Quick Add Movie"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
          +
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/20 z-40 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Add
        </h3>
        <button
          onClick={() => {
            setIsOpen(false)
            setSearchQuery('')
            setSelectedMovie(null)
            setRating('')
            setAiRecommendation(null)
          }}
          className="text-white/80 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* AI Recommendation */}
        {aiRecommendation && (
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-400/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div className="flex-1">
                <p className="text-purple-300 text-sm font-semibold mb-1">AI Suggests</p>
                <p className="text-white text-sm mb-2">{aiRecommendation}</p>
                <button
                  onClick={handleUseRecommendation}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-full transition-colors"
                >
                  Use This
                </button>
              </div>
              {isLoadingRecommendation && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-400 border-t-transparent"></div>
              )}
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a movie or show..."
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="max-h-64 overflow-y-auto bg-gray-800 rounded-lg border border-white/10">
            {suggestions.map((suggestion, index) => {
              const exists = checkIfExists(suggestion.title)
              return (
                <button
                  key={index}
                  onClick={() => handleSelectMovie(suggestion)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-white/10 transition-colors text-left"
                >
                  {suggestion.posterSmall ? (
                    <img 
                      src={suggestion.posterSmall} 
                      alt={suggestion.title}
                      className="w-10 h-14 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-white/5 rounded flex items-center justify-center text-lg">
                      🎬
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {suggestion.title}
                    </p>
                    {suggestion.year && (
                      <p className="text-white/50 text-xs">{suggestion.year}</p>
                    )}
                  </div>
                  {exists && (
                    <span className="text-xs bg-yellow-600/30 text-yellow-300 px-2 py-0.5 rounded-full">
                      Exists
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Selected Movie */}
        {selectedMovie && (
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              {selectedMovie.posterSmall && (
                <img 
                  src={selectedMovie.posterSmall} 
                  alt={selectedMovie.title}
                  className="w-12 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{selectedMovie.title}</p>
                {selectedMovie.year && (
                  <p className="text-white/50 text-xs">{selectedMovie.year}</p>
                )}
              </div>
            </div>

            {/* List Type */}
            <div className="mb-3">
              <label className="block text-white/70 text-xs mb-1 font-medium">Add to</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setListType('want')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    listType === 'want'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  📌 Want
                </button>
                <button
                  onClick={() => setListType('watched')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    listType === 'watched'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  🍿 Watched
                </button>
                <button
                  onClick={() => setListType('show')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    listType === 'show'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  📺 Shows
                </button>
              </div>
            </div>

            {/* Rating (for watched only) */}
            {listType === 'watched' && (
              <div className="mb-3">
                <label className="block text-white/70 text-xs mb-2 font-medium">Rating (optional)</label>
                <StarRating
                  rating={parseFloat(rating) || 0}
                  onRatingChange={(newRating) => setRating(newRating.toString())}
                  size="sm"
                />
              </div>
            )}

            {/* Add Button */}
            <button
              onClick={handleQuickAdd}
              disabled={isAdding}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Adding...
                </span>
              ) : (
                'Add to Collection'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

