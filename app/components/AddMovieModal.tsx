'use client'

import { useState } from 'react'

interface AddMovieModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (movieData: { title: string; rating: string; tags: string; type: string }) => Promise<void>
  defaultType?: string
}

export default function AddMovieModal({ isOpen, onClose, onAdd, defaultType = 'watched' }: AddMovieModalProps) {
  const [title, setTitle] = useState('')
  const [rating, setRating] = useState('')
  const [tags, setTags] = useState('')
  const [type, setType] = useState(defaultType)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onAdd({ title: title.trim(), rating, tags, type })
      // Reset form
      setTitle('')
      setRating('')
      setTags('')
      setType(defaultType)
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

          <div>
            <label htmlFor="title" className="block text-white font-medium mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter movie title"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-white font-medium mb-2">
              List *
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              required
            >
              <option value="watched" className="bg-gray-900">Watched</option>
              <option value="want" className="bg-gray-900">Want to Watch</option>
              <option value="show" className="bg-gray-900">TV Shows</option>
            </select>
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

