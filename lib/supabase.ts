import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  username: string
  created_at: string
}

export interface Movie {
  id?: string
  user_id: string
  title: string
  rating: string
  tags: string
  type: 'watched' | 'want' | 'show'
  created_at?: string
  updated_at?: string
}

