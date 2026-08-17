-- Movie Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  poster_url TEXT,
  overview TEXT,
  providers JSONB,
  credits JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_movies_user_id ON movies(user_id);
CREATE INDEX idx_movies_type ON movies(type);
CREATE INDEX idx_movies_rating ON movies(rating);
CREATE INDEX idx_movies_title ON movies(title);

-- Row Level Security (RLS) - Users can only see their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Policy: Users can read their own movies
CREATE POLICY "Users can read own movies" ON movies
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy: Users can insert their own movies
CREATE POLICY "Users can insert own movies" ON movies
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can update their own movies
CREATE POLICY "Users can update own movies" ON movies
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Policy: Users can delete their own movies
CREATE POLICY "Users can delete own movies" ON movies
  FOR DELETE USING (auth.uid()::text = user_id::text);

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

