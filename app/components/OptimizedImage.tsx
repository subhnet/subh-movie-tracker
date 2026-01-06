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
        {/* We use standard img for high priority to avoid Next.js Image loading churn on LCP if not perfectly tuned */}
        <Image
          src={src}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          width={500}
          height={750}
          priority={priority}
          onLoad={() => setIsLoading(false)}
          onError={() => setError(true)}
          unoptimized={error} // Fallback mode
        />
      </>
    )
  }

  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''}`}>
      <Image
        src={src}
        alt={alt}
        className={className}
        width={!fill ? 500 : undefined}
        height={!fill ? 750 : undefined}
        fill={fill}
        priority={priority}
        onError={() => setError(true)}
        unoptimized={error} // Fallback mode if optimization fails
      />
    </div>
  )
}


