-- Migration: Add poster_url column to movies table
-- Run this in your Supabase SQL Editor if you already have the movies table created

ALTER TABLE movies ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- Optional: Add index for faster queries if needed
-- CREATE INDEX IF NOT EXISTS idx_movies_poster ON movies(poster_url);

