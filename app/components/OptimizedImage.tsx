'use client'

import { useState } from 'react'

interface OptimizedImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  fallbackIcon?: string
}

export default function OptimizedImage({ src, alt, className = '', fallbackIcon = '🎬' }: OptimizedImageProps) {
  const [error, setError] = useState(false)

  // If no src or error occurred, show fallback
  if (!src || error) {
    return (
      <div className={`${className} bg-white/5 flex items-center justify-center text-6xl`}>
        {fallbackIcon}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  )
}


