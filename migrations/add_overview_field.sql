-- Add overview field to movies table for storing synopsis/plot
-- Run this in your Supabase SQL Editor

ALTER TABLE movies ADD COLUMN IF NOT EXISTS overview TEXT;

-- Add index for better search performance (optional)
CREATE INDEX IF NOT EXISTS idx_movies_overview ON movies USING gin(to_tsvector('english', overview));

