-- Fix RLS Policies for Custom JWT Authentication
-- Run this in your Supabase SQL Editor

-- Since we're using custom JWT authentication (not Supabase Auth),
-- the existing RLS policies that check auth.uid() won't work.
-- 
-- We have two options:
-- 1. Disable RLS (recommended for custom auth with server-side verification)
-- 2. Create custom RLS policies with JWT verification

-- OPTION 1: Disable RLS (RECOMMENDED)
-- This is safe because:
-- - All API routes verify JWT tokens before database access
-- - User ID is extracted from verified JWT
-- - No direct database access from client

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own movies" ON movies;
DROP POLICY IF EXISTS "Users can insert own movies" ON movies;
DROP POLICY IF EXISTS "Users can update own movies" ON movies;
DROP POLICY IF EXISTS "Users can delete own movies" ON movies;

-- Disable RLS on tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE movies DISABLE ROW LEVEL SECURITY;

-- Add comment explaining why RLS is disabled
COMMENT ON TABLE users IS 'RLS disabled - using custom JWT auth with server-side verification';
COMMENT ON TABLE movies IS 'RLS disabled - using custom JWT auth with server-side verification';

-- Verify the change
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'movies');

-- Expected output: rowsecurity should be false for both tables

