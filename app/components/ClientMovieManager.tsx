'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MovieList from './MovieList'
import MovieGrid from './MovieGrid'
import AddMovieModal from './AddMovieModal'
import Pagination from './Pagination'
import QuickAdd from './QuickAdd'

interface Movie {
  id: string
  title: string
  rating: string
  tags: string
  type: string
  poster_url?: string | null
  providers?: any
  created_at?: string
}

type TabType = 'watched' | 'want' | 'show'
type ViewMode = 'list' | 'grid'
type SortOption = 'title-asc' | 'title-desc' | 'rating-asc' | 'rating-desc' | 'date-asc' | 'date-desc'

interface ClientMovieManagerProps {
  initialMovies: Movie[]
  userId: string
  username: string
}

export default function ClientMovieManager({ initialMovies, userId, username }: ClientMovieManagerProps) {
  const router = useRouter()
  const [movies, setMovies] = useState<Movie[]>(initialMovies)
  const [activeTab, setActiveTab] = useState<TabType>('watched')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(24)
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [isLoading, setIsLoading] = useState(false)

  const COMMON_PROVIDERS = [
    { id: 'all', name: 'All Providers' },
    { id: 'Netflix', name: 'Netflix' },
    { id: 'Amazon Prime Video', name: 'Prime Video' },
    { id: 'Disney Plus', name: 'Disney+' },
    { id: 'Hotstar', name: 'Hotstar' },
    { id: 'JioCinema', name: 'JioCinema' },
    { id: 'Apple TV Plus', name: 'Apple TV+' },
    { id: 'Hulu', name: 'Hulu' },
    { id: 'Peacock', name: 'Peacock' },
    { id: 'Max', name: 'HBO Max' }
  ]

  // Load view preference from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('movieViewMode') as ViewMode
    if (savedViewMode) {
      setViewMode(savedViewMode)
    }
  }, [])

  // Save view preference to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('movieViewMode', mode)
    setItemsPerPage(mode === 'grid' ? 24 : 20)
    setCurrentPage(1)
  }

  // Reset to page 1 when changing tabs or search
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  const fetchMovies = async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    try {
      const response = await fetch(`/api/user-movies?userId=${userId}`)
      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      const allMovies = [
        ...(result.watched || []),
        ...(result.want || []),
        ...(result.shows || [])
      ]

      setMovies(allMovies)
    } catch (error) {
      console.error('Failed to fetch movies:', error)
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  const handleAddMovie = async (movieData: { title: string; rating: string; tags: string; type: string; posterUrl?: string; overview?: string } | string, type?: string, rating?: string, posterUrl?: string, overview?: string) => {
    const requestData = typeof movieData === 'string'
      ? {
        userId,
        title: movieData,
        type: type || 'want',
        rating: rating || '',
        tags: '',
        poster_url: posterUrl,
        overview: overview
      }
      : {
        userId,
        title: movieData.title,
        type: movieData.type,
        rating: movieData.rating,
        tags: movieData.tags,
        poster_url: movieData.posterUrl,
        overview: movieData.overview
      }

    const response = await fetch('/api/user-movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to add movie')
    }

    await fetchMovies()
  }

  const handleMoveMovie = async (movieId: string, newType: string) => {
    const response = await fetch('/api/user-movies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        movieId,
        type: newType
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to move movie')
    }

    // Moving a movie changes the list structure significantly, so show loading
    await fetchMovies()
  }

  const handleUpdateMovie = async (movieId: string, updates: { title?: string; rating?: string; tags?: string }) => {
    const response = await fetch('/api/user-movies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        movieId,
        ...updates
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update movie')
    }

    // Silent refresh for updates
    await fetchMovies(false)
  }

  const handleDeleteMovie = async (movieId: string) => {
    const response = await fetch(`/api/user-movies?movieId=${movieId}&userId=${userId}`, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete movie')
    }

    await fetchMovies()
  }

  const getFilteredMovies = () => {
    let filtered = movies.filter(m => m.type === activeTab)

    if (selectedProvider !== 'all') {
      filtered = filtered.filter(m => {
        if (!m.providers) return false

        // Check US and IN regions for the selected provider
        // This logic checks if ANY of the provider arrays (flatrate) contains the selected provider
        const checkRegion = (regionCode: string) => {
          const region = m.providers[regionCode]
          if (!region || !region.flatrate) return false
          return region.flatrate.some((p: any) =>
            p.provider_name.toLowerCase().includes(selectedProvider.toLowerCase()) ||
            selectedProvider.toLowerCase().includes(p.provider_name.toLowerCase())
          )
        }

        return checkRegion('US') || checkRegion('IN')
      })
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.tags?.toLowerCase().includes(query)
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title)
        case 'title-desc':
          return b.title.localeCompare(a.title)
        case 'rating-asc':
          return (parseFloat(a.rating) || 0) - (parseFloat(b.rating) || 0)
        case 'rating-desc':
          return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)
        case 'date-asc':
          return (a.created_at || '').localeCompare(b.created_at || '')
        case 'date-desc':
          return (b.created_at || '').localeCompare(a.created_at || '')
        default:
          return 0
      }
    })

    return sorted
  }

  const paginatedMovies = useMemo(() => {
    const filtered = getFilteredMovies()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filtered.slice(startIndex, endIndex)
  }, [movies, activeTab, searchQuery, currentPage, itemsPerPage, sortBy])

  const totalFilteredMovies = useMemo(() => {
    return getFilteredMovies().length
  }, [movies, activeTab, searchQuery, sortBy])

  const totalPages = Math.ceil(totalFilteredMovies / itemsPerPage)

  const getTabLabel = (type: TabType) => {
    switch (type) {
      case 'watched': return '🍿 Watched'
      case 'want': return '📌 Want to Watch'
      case 'show': return '📺 TV Shows'
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
      {/* Hero Section with Stats */}
      <header className="relative mt-8 mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-[100px] rounded-full -z-10"></div>

        <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-4">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white tracking-tight">
              CinePath
            </h1>
            <p className="text-lg text-white/60 font-medium max-w-xl leading-relaxed">
              Your personal cinematic universe. Track what you've watched, discover what's next, and build your ultimate collection.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex gap-6 shadow-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{movies.filter(m => m.type === 'watched').length}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Watched</div>
              </div>
              <div className="w-px bg-white/10"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{movies.filter(m => m.type === 'want').length}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Watchlist</div>
              </div>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="group relative px-6 py-4 bg-white text-black rounded-2xl font-bold shadow-lg hover:shadow-white/20 transition-all hover:-translate-y-1 active:translate-y-0 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <span className="relative flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Movie
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Control Center */}
      <div className="sticky top-4 z-40 space-y-4">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl ring-1 ring-white/5 mx-4 md:mx-0">
          <div className="flex flex-col lg:flex-row gap-2">

            {/* 1. Primary Tabs (Pill Style) */}
            <div className="flex bg-black/40 rounded-2xl p-1.5 shrink-0 overflow-x-auto">
              {(['watched', 'want', 'show'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab
                      ? 'text-white shadow-lg'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {activeTab === tab && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl -z-10 animate-in fade-in zoom-in duration-200"></div>
                  )}
                  <span className="flex items-center gap-2">
                    {tab === 'watched' && '🍿'}
                    {tab === 'want' && '📌'}
                    {tab === 'show' && '📺'}
                    {getTabLabel(tab).replace(/.* /, '')}
                  </span>
                </button>
              ))}
            </div>

            <div className="w-px bg-white/10 hidden lg:block my-2"></div>

            {/* 2. Search Bar */}
            <div className="flex-1 relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search your ${activeTab === 'show' ? 'shows' : 'movies'}...`}
                className="w-full h-full min-h-[48px] bg-transparent border-0 text-white placeholder-white/20 focus:ring-0 px-4 text-base peer"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 peer-focus:text-blue-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="w-px bg-white/10 hidden lg:block my-2"></div>

            {/* 3. Filters & View Toggle */}
            <div className="flex items-center gap-2 p-1 overflow-x-auto">
              {/* Sort Dropdown */}
              <div className="relative group shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption)
                    setCurrentPage(1)
                  }}
                  className="appearance-none bg-white/5 hover:bg-white/10 text-white/80 text-sm font-medium h-10 pl-3 pr-8 rounded-xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                >
                  <option value="date-desc" className="bg-gray-900">Newest Added</option>
                  <option value="date-asc" className="bg-gray-900">Oldest Added</option>
                  <option value="rating-desc" className="bg-gray-900">Highest Rated</option>
                  <option value="rating-asc" className="bg-gray-900">Lowest Rated</option>
                  <option value="title-asc" className="bg-gray-900">Title (A-Z)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Provider Filter */}
              <div className="relative group shrink-0">
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="appearance-none bg-white/5 hover:bg-white/10 text-white/80 text-sm font-medium h-10 pl-3 pr-8 rounded-xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                >
                  {COMMON_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              <div className="w-px bg-white/10 h-6 mx-1"></div>

              {/* View Toggle */}
              <div className="flex bg-black/40 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                  title="Grid View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                  title="List View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 md:px-0 min-h-[500px]">
        {searchQuery && (
          <div className="mb-6 text-white/50 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            Found {totalFilteredMovies} matches for "{searchQuery}"
          </div>
        )}

        {viewMode === 'grid' ? (
          <MovieGrid
            movies={paginatedMovies}
            onMoveMovie={handleMoveMovie}
            onUpdateMovie={handleUpdateMovie}
            onDeleteMovie={handleDeleteMovie}
            currentType={activeTab}
            isLoading={isLoading}
          />
        ) : (
          <MovieList
            movies={paginatedMovies}
            onMoveMovie={handleMoveMovie}
            onUpdateMovie={handleUpdateMovie}
            onDeleteMovie={handleDeleteMovie}
            currentType={activeTab}
            isLoading={isLoading}
          />
        )}

        {/* Empty State */}
        {!isLoading && totalFilteredMovies === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 mb-6">
              <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No movies found</h3>
            <p className="text-white/40 max-w-sm mx-auto mb-8">
              {searchQuery
                ? `We couldn't find anything matching "${searchQuery}" in your ${activeTab} list.`
                : "Your collection is looking a bit empty. Time to add some favorites!"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all"
              >
                Add Movie
              </button>
            )}
          </div>
        )}

        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalFilteredMovies}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <AddMovieModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMovie}
        defaultType={activeTab}
        existingMovies={movies.map(m => ({ title: m.title, type: m.type }))}
      />

      <QuickAdd
        onAdd={handleAddMovie}
        existingMovies={movies.map(m => ({ title: m.title, type: m.type }))}
      />
    </div>
  )
}
