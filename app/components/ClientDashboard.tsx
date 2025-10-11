'use client'

import { useState, useMemo } from 'react'
import QuickAdd from './QuickAdd'

interface Movie {
  title: string
  rating: string
  tags: string
  type: string
  [key: string]: any
}

interface ClientDashboardProps {
  initialMovies: Movie[]
  userId: string
}

export default function ClientDashboard({ initialMovies, userId }: ClientDashboardProps) {
  const [isAdding, setIsAdding] = useState(false)

  const handleAddMovie = async (title: string, type: string, rating: string, posterUrl?: string, overview?: string) => {
    setIsAdding(true)
    try {
      const response = await fetch('/api/user-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          type,
          rating: rating || '',
          tags: '',
          poster_url: posterUrl,
          overview: overview
        })
      })

      if (!response.ok) throw new Error('Failed to add movie')
      
      // Refresh the page to show new data
      window.location.reload()
    } catch (error) {
      console.error('Failed to add movie:', error)
      throw error
    } finally {
      setIsAdding(false)
    }
  }

  const existingMovies = useMemo(() => {
    return initialMovies.map((m: any) => ({ title: m.title, type: m.type }))
  }, [initialMovies])

  return (
    <>
      {/* Quick Add FAB */}
      <QuickAdd
        onAdd={handleAddMovie}
        existingMovies={existingMovies}
      />
    </>
  )
}


