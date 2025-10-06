'use client'

interface StarRatingProps {
  rating: string
  onChange: (rating: string) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function StarRating({ rating, onChange, disabled = false, size = 'md' }: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
          const isSelected = Number(rating) >= star
          const isHalfSelected = Number(rating) === star - 0.5
          
          return (
            <div key={star} className="relative group">
              {/* Full star button */}
              <button
                type="button"
                onClick={() => onChange(star.toString())}
                disabled={disabled}
                className="relative transition-transform hover:scale-110 focus:outline-none disabled:cursor-not-allowed"
                title={`${star} stars`}
              >
                <svg
                  className={`${sizeClasses[size]} transition-colors ${
                    isSelected
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-white/20 fill-white/10 hover:text-yellow-300 hover:fill-yellow-300'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
              {/* Half star button (left half) */}
              <button
                type="button"
                onClick={() => onChange((star - 0.5).toString())}
                disabled={disabled}
                className="absolute left-0 top-0 w-1/2 h-full z-10 opacity-0 hover:opacity-100 focus:outline-none disabled:cursor-not-allowed"
                title={`${star - 0.5} stars`}
              >
                <svg
                  className={`${sizeClasses[size]} transition-colors ${
                    isHalfSelected
                      ? 'text-yellow-400'
                      : 'text-yellow-300'
                  }`}
                  viewBox="0 0 20 20"
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                >
                  <path
                    fill="currentColor"
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              </button>
            </div>
          )
        })}
        {rating && (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled}
            className="ml-2 text-white/40 hover:text-white/80 transition-colors text-sm"
            title="Clear rating"
          >
            ✕
          </button>
        )}
      </div>
      {rating && (
        <div className="text-xs text-white/60">
          {rating}/10 stars
        </div>
      )}
    </div>
  )
}


