'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import type { Recommendation } from '@/lib/types'

export default function RecommendationsPage() {
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [type, setType] = useState<'general' | 'watchlist'>('general')
  const [user, setUser] = useState<any>(null)
  const [addingMovie, setAddingMovie] = useState<number | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  useEffect(() => {
    const fetchPosters = async () => {
      const recsWithPosters = await Promise.all(recommendations.map(async (rec) => {
        if (rec.posterUrl) return rec

        try {
          const res = await fetch(`/api/search-movies?query=${encodeURIComponent(rec.title)}&type=movie`)
          const data = await res.json()
          if (data.results && data.results.length > 0) {
            return { ...rec, posterUrl: data.results[0].poster }
          }
        } catch (e) {
          console.error('Failed to fetch poster for', rec.title)
        }
        return rec
      }))

      // Only update if we actually found new posters to avoid infinite loops
      const hasNewPosters = recsWithPosters.some((r, i) => r.posterUrl !== recommendations[i].posterUrl)
      if (hasNewPosters) {
        setRecommendations(recsWithPosters)
      }
    }

    if (recommendations.length > 0) {
      fetchPosters()
    }
  }, [recommendations])

  const getRecommendations = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          userId: user?.id // Send userId if logged in
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to get recommendations')
        setRecommendations([])
      } else {
        setRecommendations((data.recommendations || []).map((r: any) => ({ ...r, posterUrl: null })))
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToList = async (movie: Recommendation, listType: 'watched' | 'want' | 'show', index: number) => {
    if (!user) {
      alert('Please login to add movies')
      router.push('/login')
      return
    }

    setAddingMovie(index)

    try {
      // First, search for the movie to get its poster
      let posterUrl = null
      try {
        const searchResponse = await fetch(`/api/search-movies?query=${encodeURIComponent(movie.title)}&type=movie`)
        const searchData = await searchResponse.json()
        if (searchData.results && searchData.results.length > 0) {
          posterUrl = searchData.results[0].poster // Use the medium-sized poster
        }
      } catch (searchErr) {
        console.log('Could not fetch poster, continuing without it')
      }

      const response = await fetch('/api/user-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: movie.title,
          rating: '',
          tags: movie.genres?.join(', ') || '',
          type: listType,
          posterUrl: posterUrl
        })
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to add movie')
        return
      }

      alert(`"${movie.title}" added to your ${listType === 'watched' ? 'Watched' : listType === 'want' ? 'Watchlist' : 'Shows'}!`)
    } catch (err) {
      alert('Failed to add movie. Please try again.')
    } finally {
      setAddingMovie(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 md:p-12 shadow-2xl text-center">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full mb-6 border border-white/10">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-white/90 text-sm font-semibold uppercase tracking-wider">AI-Powered Suggestions</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 bg-gradient-to-r from-purple-200 via-pink-200 to-orange-200 bg-clip-text text-transparent">
            Movie Recommendations
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
            Get personalized movie suggestions powered by AI, tailored to your unique taste
          </p>
        </div>
      </header>

      {/* Selection Cards */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
        <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            <h2 className="text-2xl font-bold text-white">
              What would you like?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <button
              onClick={() => setType('general')}
              className={`group relative overflow-hidden p-8 rounded-2xl transition-all duration-300 text-left ${type === 'general'
                ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                } border-2`}
            >
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center mb-4 border border-white/10">
                  <span className="text-2xl">🎬</span>
                </div>
                <div className={`font-bold text-xl mb-2 text-white`}>
                  New Recommendations
                </div>
                <div className={`text-sm text-white/60`}>
                  Discover fresh movies you haven't seen yet
                </div>
              </div>
              {type === 'general' && (
                <div className="absolute top-4 right-4 text-purple-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>

            <button
              onClick={() => setType('watchlist')}
              className={`group relative overflow-hidden p-8 rounded-2xl transition-all duration-300 text-left ${type === 'watchlist'
                ? 'bg-gradient-to-br from-pink-500/20 to-orange-600/20 border-pink-500/50 shadow-lg shadow-pink-500/10'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                } border-2`}
            >
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-orange-600/20 rounded-xl flex items-center justify-center mb-4 border border-white/10">
                  <span className="text-2xl">⭐</span>
                </div>
                <div className={`font-bold text-xl mb-2 text-white`}>
                  Prioritize Watchlist
                </div>
                <div className={`text-sm text-white/60`}>
                  Get suggestions from your existing watchlist
                </div>
              </div>
              {type === 'watchlist' && (
                <div className="absolute top-4 right-4 text-pink-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          <button
            onClick={getRecommendations}
            disabled={loading}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <div className="relative flex items-center justify-center gap-3">
              {loading ? (
                <>
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Consulting the AI Director...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Generate Recommendations
                </>
              )}
            </div>
          </button>

          {error && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-200 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {recommendations.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-3xl font-bold text-white">Your Personalized Picks</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50"></div>
                <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Poster */}
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                      <div className="w-40 h-60 rounded-2xl overflow-hidden shadow-2xl relative bg-black/40 border border-white/5 group-hover:scale-105 transition-transform duration-300">
                        {rec.posterUrl ? (
                          <img
                            src={rec.posterUrl}
                            alt={rec.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                            <span className="text-5xl">🎬</span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-white font-bold border border-white/20 shadow-lg">
                          #{index + 1}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-center md:text-left flex flex-col">
                      <div className="mb-4">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                          <h3 className="text-3xl font-bold text-white tracking-tight">
                            {rec.title}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                            {rec.confidence}% match
                          </span>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                          {rec.genres && rec.genres.map((genre, i) => (
                            <span
                              key={i}
                              className="text-xs font-medium text-white/50 bg-white/5 px-2 py-1 rounded-lg border border-white/5"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="relative mb-6 bg-white/5 rounded-2xl p-5 border border-white/5">
                        <div className="absolute -left-1 -top-1 text-4xl text-white/10">"</div>
                        <p className="text-white/80 leading-relaxed italic relative z-10">
                          {rec.reason}
                        </p>
                      </div>

                      {/* Add to List Buttons */}
                      <div className="mt-auto flex flex-wrap gap-3 justify-center md:justify-start">
                        <button
                          onClick={() => handleAddToList(rec, 'want', index)}
                          disabled={addingMovie === index}
                          className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg hover:shadow-white/20 active:translate-y-0.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                          Add to Watchlist
                        </button>
                        <button
                          onClick={() => handleAddToList(rec, 'watched', index)}
                          className="flex items-center gap-2 bg-white/5 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all text-sm border border-white/10 hover:border-white/20 active:translate-y-0.5"
                        >
                          <span className="text-lg">👀</span>
                          Mark Saw It
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
