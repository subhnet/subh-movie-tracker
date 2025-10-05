'use client'

import { useState, useEffect } from 'react'
import { getUser } from '@/lib/auth'
import type { Recommendation } from '@/lib/types'

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [type, setType] = useState<'general' | 'watchlist'>('general')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

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
        setRecommendations(data.recommendations || [])
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 p-8 md:p-12 shadow-2xl text-center">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full mb-6 border border-white/20">
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl"></div>
        <div className="relative bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/30">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              What would you like?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setType('general')}
              className={`group relative overflow-hidden p-6 rounded-xl transition-all duration-300 ${
                type === 'general'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white/50 hover:bg-white/80 border-2 border-gray-200 hover:border-purple-300 hover:scale-102'
              }`}
            >
              <div className="relative z-10">
                <div className="text-4xl mb-3">🎬</div>
                <div className={`font-bold text-lg mb-2 ${type === 'general' ? 'text-white' : 'text-gray-800'}`}>
                  New Recommendations
                </div>
                <div className={`text-sm ${type === 'general' ? 'text-white/90' : 'text-gray-600'}`}>
                  Discover fresh movies you haven't seen yet
                </div>
              </div>
              {type === 'general' && (
                <div className="absolute top-3 right-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
            
            <button
              onClick={() => setType('watchlist')}
              className={`group relative overflow-hidden p-6 rounded-xl transition-all duration-300 ${
                type === 'watchlist'
                  ? 'bg-gradient-to-br from-pink-500 to-orange-600 text-white shadow-lg scale-105'
                  : 'bg-white/50 hover:bg-white/80 border-2 border-gray-200 hover:border-pink-300 hover:scale-102'
              }`}
            >
              <div className="relative z-10">
                <div className="text-4xl mb-3">⭐</div>
                <div className={`font-bold text-lg mb-2 ${type === 'watchlist' ? 'text-white' : 'text-gray-800'}`}>
                  Prioritize Watchlist
                </div>
                <div className={`text-sm ${type === 'watchlist' ? 'text-white/90' : 'text-gray-600'}`}>
                  Get suggestions from your existing watchlist
                </div>
              </div>
              {type === 'watchlist' && (
                <div className="absolute top-3 right-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          <button
            onClick={getRecommendations}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Generating Recommendations...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get AI Recommendations
              </span>
            )}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-800 font-semibold">{error}</p>
                  {error.includes('API key') && (
                    <div className="mt-3 text-sm text-red-700">
                      <p className="font-medium">AI recommendations require proper API configuration. Please contact the administrator.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
            <h2 className="text-2xl font-bold text-white">Your Personalized Picks</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {recommendations.map((rec, index) => (
              <div 
                key={index}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30 hover:scale-[1.02] transition-all duration-300">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Number Badge */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                        <span className="text-3xl font-black text-white">#{index + 1}</span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                        {rec.title}
                        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">{rec.reason}</p>
                      {rec.genres && rec.genres.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {rec.genres.map((genre, i) => (
                            <span 
                              key={i}
                              className="inline-flex items-center bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold border border-blue-200/50"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Confidence Score */}
                    <div className="flex-shrink-0 text-center md:text-right">
                      <div className="inline-flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
                        <div className="text-3xl font-black text-white">
                          {rec.confidence}%
                        </div>
                        <div className="text-xs text-white/90 font-semibold uppercase tracking-wider">Match</div>
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

