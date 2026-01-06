-- Add a JSONB column to store streaming providers
-- This allows storing complex provider data (US, IN, etc.) efficiently
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS providers JSONB;

-- Optional: Create an index for faster filtering if you have valid JSON filtering requirements later
-- CREATE INDEX IF NOT EXISTS idx_movies_providers ON movies USING gin (providers);
