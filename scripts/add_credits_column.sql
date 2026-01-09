-- Add a JSONB column to store cast and crew credits
-- This allows storing structured data about actors and directors
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS credits JSONB;

-- Optional: Create an index using GIN (Generalized Inverted Index) for faster JSON querying
-- This is useful if you plan to search movies by actor name or director
-- CREATE INDEX IF NOT EXISTS idx_movies_credits ON movies USING gin (credits);
