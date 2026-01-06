import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create a simple in-memory rate limiter for development
// For production, you'll want to set up Upstash Redis
class MemoryStore {
  private store: Map<string, { count: number; reset: number }>

  constructor() {
    this.store = new Map()
  }

  async increment(key: string, limit: number): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now()
    const item = this.store.get(key)

    if (!item || now > item.reset) {
      // Reset or create new entry
      this.store.set(key, {
        count: 1,
        reset: now + 10000, // 10 seconds window
      })
      return {
        success: true,
        limit: limit,
        remaining: limit - 1,
        reset: now + 10000,
      }
    }

    // Increment count
    item.count++

    if (item.count > limit) {
      return {
        success: false,
        limit: limit,
        remaining: 0,
        reset: item.reset,
      }
    }

    return {
      success: true,
      limit: limit,
      remaining: limit - item.count,
      reset: item.reset,
    }
  }
}

// Simple in-memory rate limiter (for development/testing)
const memoryStore = new MemoryStore()

// Rate limiter function that works with or without Upstash
export async function rateLimit(identifier: string, limit: number = 10): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  // Check if Upstash is configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })

      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, '10 s'),
        analytics: true,
      })

      const result = await ratelimit.limit(identifier)

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      }
    } catch (error) {
      console.error('Upstash rate limit error, falling back to memory:', error)
      return memoryStore.increment(identifier, limit)
    }
  }

  // Fallback to in-memory rate limiting
  return memoryStore.increment(identifier, limit)
}

// Specific rate limiters for different endpoints
export async function rateLimitAuth(identifier: string) {
  return rateLimit(`auth:${identifier}`, 10) // 10 attempts per 10 seconds
}

export async function rateLimitAPI(identifier: string) {
  return rateLimit(`api:${identifier}`, 60) // 60 requests per 10 seconds (increased for local dev)
}

export async function rateLimitAI(identifier: string) {
  return rateLimit(`ai:${identifier}`, 5) // 5 AI requests per 10 seconds (expensive)
}

export async function rateLimitSearch(identifier: string) {
  return rateLimit(`search:${identifier}`, 10) // 10 searches per 10 seconds
}

