/**
 * Movie API Configuration
 * 
 * This file makes it easy to switch between TMDB and OMDb APIs.
 * Simply set TMDB_API_KEY or OMDB_API_KEY in your .env.local file.
 * 
 * Priority Order:
 * 1. TMDB (if TMDB_API_KEY is set)
 * 2. OMDb (if OMDB_API_KEY is set)
 * 3. Fallback between them if one fails
 */

export const MovieAPIConfig = {
  // API Keys (read from environment)
  tmdbApiKey: process.env.TMDB_API_KEY,
  omdbApiKey: process.env.OMDB_API_KEY,

  // API Base URLs
  tmdbBaseUrl: 'https://api.themoviedb.org/3',
  omdbBaseUrl: 'https://www.omdbapi.com',

  // Feature flags - easy to toggle features on/off
  features: {
    autoFetchSynopsis: true,      // Auto-fetch synopsis when missing
    autoFetchPosters: true,        // Auto-fetch posters when missing
    saveFetchedData: true,         // Save fetched data to database
    enableFallback: true,          // Fallback to secondary API if primary fails
  },

  // Preference (which API to try first)
  // Options: 'tmdb' | 'omdb' | 'auto'
  // 'auto' = use whichever API key is available (TMDB preferred)
  preference: 'auto' as 'tmdb' | 'omdb' | 'auto',

  // Get the preferred API to use
  getPreferredAPI(): 'tmdb' | 'omdb' | null {
    if (this.preference === 'tmdb' && this.tmdbApiKey) return 'tmdb'
    if (this.preference === 'omdb' && this.omdbApiKey) return 'omdb'
    
    // Auto mode: prefer TMDB if available
    if (this.tmdbApiKey) return 'tmdb'
    if (this.omdbApiKey) return 'omdb'
    
    return null
  },

  // Check if any API is configured
  isConfigured(): boolean {
    return !!(this.tmdbApiKey || this.omdbApiKey)
  },

  // Get configuration info (useful for debugging)
  getInfo() {
    return {
      configured: this.isConfigured(),
      tmdb: !!this.tmdbApiKey,
      omdb: !!this.omdbApiKey,
      preferred: this.getPreferredAPI(),
      features: this.features
    }
  }
}

/**
 * HOW TO SWITCH BETWEEN APIs:
 * 
 * Method 1: Use environment variables (Recommended)
 * ------------------------------------------------
 * In .env.local:
 * 
 * # Use TMDB (preferred - more data)
 * TMDB_API_KEY=your_tmdb_key_here
 * 
 * # Use OMDb (alternative - simpler)
 * OMDB_API_KEY=your_omdb_key_here
 * 
 * # Use both (automatic fallback)
 * TMDB_API_KEY=your_tmdb_key_here
 * OMDB_API_KEY=your_omdb_key_here
 * 
 * 
 * Method 2: Change preference in code
 * ------------------------------------
 * In this file, change the preference line:
 * 
 * preference: 'tmdb'  // Always try TMDB first
 * preference: 'omdb'  // Always try OMDb first
 * preference: 'auto'  // Automatic (TMDB preferred if both available)
 * 
 * 
 * Method 3: Disable features
 * --------------------------
 * In the features object above:
 * 
 * autoFetchSynopsis: false  // Don't auto-fetch synopsis
 * enableFallback: false     // Don't fallback to secondary API
 */

