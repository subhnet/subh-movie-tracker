'use client'

import { useState } from 'react'
import Image from 'next/image'

interface OptimizedImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  fallbackIcon?: string
  priority?: boolean // Add priority prop for above-the-fold images
  fill?: boolean // For responsive images
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  fallbackIcon = '🎬',
  priority = false,
  fill = false
}: OptimizedImageProps) {
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // If no src or error occurred, show fallback
  if (!src || error) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-6xl`}>
        {fallbackIcon}
      </div>
    )
  }

  // Show loading skeleton while image loads
  if (isLoading && priority) {
    return (
      <>
        <div className={`${className} bg-gradient-to-br from-gray-700 to-gray-800 animate-pulse`} />
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0 absolute' : 'opacity-100'} transition-opacity duration-300`}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setIsLoading(false)}
          onError={() => setError(true)}
        />
      </>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setError(true)}
    />
  )
}


