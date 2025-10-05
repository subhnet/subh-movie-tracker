'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth'
import MovieList from '../components/MovieList'
import MovieGrid from '../components/MovieGrid'
import AddMovieModal from '../components/AddMovieModal'
import Pagination from '../components/Pagination'

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

export default function ManageMoviesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('watched')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(24) // 24 for grid (6x4), adjustable

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
    // Adjust items per page based on view mode
    setItemsPerPage(mode === 'grid' ? 24 : 20)
    setCurrentPage(1) // Reset to first page when changing view
  }

  // Reset to page 1 when changing tabs or search
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  useEffect(() => {
    const currentUser = getUser()
    
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    setUser(currentUser)
    fetchMovies(currentUser.id)
  }, [router])

  const fetchMovies = async (userId: string) => {
    try {
      const response = await fetch(`/api/user-movies?userId=${userId}`)
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Combine all movies into a single array
      const allMovies = [
        ...(result.watched || []),
        ...(result.want || []),
        ...(result.shows || [])
      ]
      
      setMovies(allMovies)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch movies:', error)
      setLoading(false)
    }
  }

  const handleAddMovie = async (movieData: { title: string; rating: string; tags: string; type: string; posterUrl?: string }) => {
    if (!user) return

    const response = await fetch('/api/user-movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        ...movieData
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to add movie')
    }

    // Refresh movies
    await fetchMovies(user.id)
  }

  const handleMoveMovie = async (movieId: string, newType: string) => {
    if (!user) return

    const response = await fetch('/api/user-movies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        movieId,
        type: newType
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to move movie')
    }

    // Refresh movies
    await fetchMovies(user.id)
  }

  const handleUpdateMovie = async (movieId: string, updates: { title?: string; rating?: string; tags?: string }) => {
    if (!user) return

    const response = await fetch('/api/user-movies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        movieId,
        ...updates
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update movie')
    }

    // Refresh movies
    await fetchMovies(user.id)
  }

  const handleDeleteMovie = async (movieId: string) => {
    if (!user) return

    const response = await fetch(`/api/user-movies?movieId=${movieId}&userId=${user.id}`, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete movie')
    }

    // Refresh movies
    await fetchMovies(user.id)
  }

  const getFilteredMovies = () => {
    const filteredByType = movies.filter(m => m.type === activeTab)
    
    if (!searchQuery.trim()) {
      return filteredByType
    }

    const query = searchQuery.toLowerCase()
    return filteredByType.filter(m => 
      m.title.toLowerCase().includes(query) ||
      m.tags?.toLowerCase().includes(query)
    )
  }

  // Pagination logic with useMemo for performance
  const paginatedMovies = useMemo(() => {
    const filtered = getFilteredMovies()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filtered.slice(startIndex, endIndex)
  }, [movies, activeTab, searchQuery, currentPage, itemsPerPage])

  const totalFilteredMovies = useMemo(() => {
    return getFilteredMovies().length
  }, [movies, activeTab, searchQuery])

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white mt-4">Loading your movies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            🎬 Manage Movies
          </h1>
          <p className="text-white/70">
            Add, edit, and organize your movie collection
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg"
        >
          ➕ Add Movie
        </button>
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
          
          {/* Items per page selector */}
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
          
          {/* View Toggle */}
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

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalFilteredMovies}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add Movie Modal */}
      <AddMovieModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMovie}
        defaultType={activeTab}
      />
    </div>
  )
}

