'use client'

import { useState, useEffect, useRef } from 'react'

interface MovieSuggestion {
  title: string
  year?: string
  type?: string
  posterSmall?: string
  poster?: string
  posterLarge?: string
  overview?: string
}

interface QuickAddProps {
  onAdd: (title: string, type: string, rating: string, posterUrl?: string, overview?: string) => Promise<void>
  existingMovies?: Array<{ title: string; type: string }>
}

export default function QuickAdd({ onAdd, existingMovies = [] }: QuickAddProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null)
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null) // Track which movie is being added

  const inputRef = useRef<HTMLInputElement>(null)

  // Open/Close shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([])
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search-movies?query=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.results || [])
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Get AI recommendation
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
      console.warn('Failed to get recommendation:', error)
    } finally {
      setIsLoadingRecommendation(false)
    }
  }

  const handleAdd = async (movie: MovieSuggestion, type: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setAddingId(`${movie.title}-${type}`)

    try {
      await onAdd(
        movie.title,
        type,
        '', // No rating initially for quick add
        movie.poster || movie.posterSmall,
        movie.overview
      )

      // Optional: Close after adding? Or just show success state?
      // Let's keep it open for multi-add, but visual feedback is key
    } catch (error) {
      console.error('Failed to add movie:', error)
    } finally {
      setAddingId(null)
    }
  }

  const checkStatus = (title: string) => {
    const found = existingMovies.find(m => m.title.toLowerCase() === title.toLowerCase())
    return found ? found.type : null
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
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-40 group"
        title="Quick Add (Cmd+K)"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#0f1014]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-200">

        {/* Search Bar */}
        <div className="flex items-center p-4 border-b border-white/10 gap-3">
          <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-xl text-white placeholder-white/20 focus:outline-none"
            placeholder="Search movies, shows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white/40 font-mono">
              ESC
            </kbd>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">

          {/* AI Suggestion (Only if no search results yet) */}
          {!searchQuery && aiRecommendation && (
            <div className="mb-4 mx-2 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <div className="text-xs text-purple-300 font-bold uppercase tracking-wider">AI Suggestion</div>
                  <div className="text-white font-medium">{aiRecommendation}</div>
                </div>
              </div>
              <button
                onClick={() => setSearchQuery(aiRecommendation)}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 rounded-lg text-sm font-medium transition-colors"
              >
                Use
              </button>
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="py-12 flex flex-col items-center text-white/30 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Searching the known universe...</span>
            </div>
          )}

          {/* Search Results */}
          <div className="space-y-1">
            {suggestions.map((movie) => {
              const status = checkStatus(movie.title)

              return (
                <div
                  key={movie.title + movie.year}
                  className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  {/* Poster */}
                  <div className="shrink-0 w-10 h-14 bg-white/5 rounded-lg overflow-hidden">
                    {movie.posterSmall ? (
                      <img src={movie.posterSmall} alt={movie.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold truncate">{movie.title}</h4>
                    <p className="text-white/40 text-sm">{movie.year}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {status ? (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${status === 'watched' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                          status === 'want' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                            'border-purple-500/30 text-purple-400 bg-purple-500/10'
                        }`}>
                        {status === 'watched' ? '✓ Watched' : status === 'want' ? '✓ Watchlist' : '✓ Shows'}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleAdd(movie, 'want', e)}
                          disabled={!!addingId}
                          className="px-3 py-1.5 bg-white/5 hover:bg-blue-600/80 hover:text-white text-white/60 rounded-lg text-xs font-medium transition-all border border-white/5 hover:border-blue-500/50"
                        >
                          {addingId === `${movie.title}-want` ? '...' : '+ Want'}
                        </button>
                        <button
                          onClick={(e) => handleAdd(movie, 'watched', e)}
                          disabled={!!addingId}
                          className="px-3 py-1.5 bg-white/5 hover:bg-green-600/80 hover:text-white text-white/60 rounded-lg text-xs font-medium transition-all border border-white/5 hover:border-green-500/50"
                        >
                          {addingId === `${movie.title}-watched` ? '...' : '+ Watched'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {!isSearching && searchQuery && suggestions.length === 0 && (
              <div className="py-8 text-center text-white/30">
                No movies found matching "{searchQuery}"
              </div>
            )}

            {!searchQuery && !aiRecommendation && (
              <div className="py-12 text-center text-white/20">
                Type to start searching...
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-white/5 bg-black/20 text-[10px] text-white/30 flex justify-between px-4">
          <span>Search powered by TMDB</span>
          <div className="flex gap-3">
            <span>Example: "Inception", "The Office"</span>
          </div>
        </div>
      </div>
    </div>
  )
}
