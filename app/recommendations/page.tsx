'use client'

import { useState } from 'react'
import type { Recommendation } from '@/lib/types'

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [type, setType] = useState<'general' | 'watchlist'>('general')

  const getRecommendations = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
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
    <div className="max-w-5xl mx-auto">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
          🤖 AI Movie Recommendations
        </h1>
        <p className="text-white/90 text-lg drop-shadow">
          Powered by OpenRouter • Personalized to your taste
        </p>
      </header>

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          What would you like?
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button
            onClick={() => setType('general')}
            className={`flex-1 p-4 rounded-xl border-2 transition-all ${
              type === 'general'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <div className="text-2xl mb-2">🎬</div>
            <div className="font-semibold">New Recommendations</div>
            <div className="text-sm text-gray-600 mt-1">
              Discover movies you haven't seen
            </div>
          </button>
          
          <button
            onClick={() => setType('watchlist')}
            className={`flex-1 p-4 rounded-xl border-2 transition-all ${
              type === 'watchlist'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <div className="text-2xl mb-2">📝</div>
            <div className="font-semibold">Prioritize Watchlist</div>
            <div className="text-sm text-gray-600 mt-1">
              What to watch next from your list
            </div>
          </button>
        </div>

        <button
          onClick={getRecommendations}
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Getting Recommendations...
            </span>
          ) : (
            '✨ Get AI Recommendations'
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
            {error.includes('API key') && (
              <div className="mt-2 text-sm">
                <p>To enable AI recommendations:</p>
                <ol className="list-decimal ml-5 mt-1">
                  <li>Get an API key from <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline font-semibold">OpenRouter</a></li>
                  <li>Create a <code className="bg-red-100 px-1 rounded">.env.local</code> file</li>
                  <li>Add: <code className="bg-red-100 px-1 rounded">OPENROUTER_API_KEY=your-key-here</code></li>
                  <li>Restart the dev server</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6 drop-shadow">
            Your Personalized Recommendations
          </h2>
          {recommendations.map((rec, index) => (
            <div 
              key={index}
              className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-primary-600">
                      #{index + 1}
                    </span>
                    <h3 className="text-xl font-bold text-gray-800">
                      {rec.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-3">{rec.reason}</p>
                  {rec.genres && rec.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {rec.genres.map((genre, i) => (
                        <span 
                          key={i}
                          className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-4 text-center">
                  <div className="text-3xl font-bold text-primary-600">
                    {rec.confidence}%
                  </div>
                  <div className="text-xs text-gray-500">Confidence</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

