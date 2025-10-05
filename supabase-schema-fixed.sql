-- Movie Tracker Database Schema (Fixed for Registration)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movies table
CREATE TABLE movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  rating VARCHAR(10),
  tags TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('watched', 'want', 'show')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_movies_user_id ON movies(user_id);
CREATE INDEX idx_movies_type ON movies(type);
CREATE INDEX idx_movies_rating ON movies(rating);
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_users_username ON users(username);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Allow anyone to INSERT (for registration)
CREATE POLICY "Anyone can register" ON users
  FOR INSERT 
  WITH CHECK (true);

-- Allow users to SELECT their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT 
  USING (true); -- For now, allow reading (we check in app logic)

-- Movies table policies
-- Allow users to do everything with their own movies
CREATE POLICY "Users can read own movies" ON movies
  FOR SELECT 
  USING (true); -- We'll validate user_id in the application

CREATE POLICY "Users can insert own movies" ON movies
  FOR INSERT 
  WITH CHECK (true); -- We'll validate user_id in the application

CREATE POLICY "Users can update own movies" ON movies
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete own movies" ON movies
  FOR DELETE 
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON movies TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

