-- ----------------------------------------------------------------------------
-- MEYALO DATABASE MIGRATION 001: INITIAL SCHEMA & ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('physical', 'virtual', 'hybrid')),
  category TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  city TEXT NOT NULL,
  venue_name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  organizer_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create index on frequently queried columns (city, format, start_at)
CREATE INDEX IF NOT EXISTS idx_events_city ON public.events (city);
CREATE INDEX IF NOT EXISTS idx_events_format ON public.events (format);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events (start_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 4. Create Public Read Policy
-- Allows any app user (authenticated or anonymous) to view active growth events
CREATE POLICY "Allow public read access to events"
  ON public.events
  FOR SELECT
  USING (true);
