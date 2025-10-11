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

  const fetchMovies = async () => {
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

    await fetchMovies()
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
    const filteredByType = movies.filter(m => m.type === activeTab)
    
    let filtered = filteredByType
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filteredByType.filter(m => 
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

  const getTabCount = (type: TabType) => {
    return movies.filter(m => m.type === type).length
  }

  const getTabLabel = (type: TabType) => {
    switch (type) {
      case 'watched': return '🍿 Watched'
      case 'want': return '📌 Want to Watch'
      case 'show': return '📺 TV Shows'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-2xl"></div>
        <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 p-6 md:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-2 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                My Collection
              </h1>
              <p className="text-white/80 text-lg">
                Track, organize, and discover your favorite movies
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Movie
            </button>
          </div>
        </div>
      </header>

      {/* Search Bar and View Toggle */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies by title or tags..."
            className="flex-1 min-w-[200px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortOption)
              setCurrentPage(1)
            }}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date-desc" className="bg-gray-900">Newest First</option>
            <option value="date-asc" className="bg-gray-900">Oldest First</option>
            <option value="title-asc" className="bg-gray-900">Title (A-Z)</option>
            <option value="title-desc" className="bg-gray-900">Title (Z-A)</option>
            <option value="rating-desc" className="bg-gray-900">Rating (High-Low)</option>
            <option value="rating-asc" className="bg-gray-900">Rating (Low-High)</option>
          </select>
          
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={12} className="bg-gray-900">12 per page</option>
            <option value={24} className="bg-gray-900">24 per page</option>
            <option value={48} className="bg-gray-900">48 per page</option>
            <option value={96} className="bg-gray-900">96 per page</option>
          </select>
          
          <div className="flex gap-2 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`px-4 py-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
              title="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-4 py-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
              title="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-2">
        <div className="flex gap-2">
          {(['watched', 'want', 'show'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {getTabLabel(tab)}
              <span className="ml-2 text-sm opacity-75">
                ({getTabCount(tab)})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Movie Display */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {getTabLabel(activeTab)}
          </h2>
          <p className="text-white/60 text-sm">
            {searchQuery 
              ? `${totalFilteredMovies} result${totalFilteredMovies !== 1 ? 's' : ''}`
              : `${totalFilteredMovies} movie${totalFilteredMovies !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        
        {viewMode === 'grid' ? (
          <MovieGrid
            movies={paginatedMovies}
            onMoveMovie={handleMoveMovie}
            onUpdateMovie={handleUpdateMovie}
            onDeleteMovie={handleDeleteMovie}
            currentType={activeTab}
          />
        ) : (
          <MovieList
            movies={paginatedMovies}
            onMoveMovie={handleMoveMovie}
            onUpdateMovie={handleUpdateMovie}
            onDeleteMovie={handleDeleteMovie}
            currentType={activeTab}
          />
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalFilteredMovies}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
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


