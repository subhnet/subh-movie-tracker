-- Add columns for Google OAuth support
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Make password_hash optional (NULL for Google users)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

