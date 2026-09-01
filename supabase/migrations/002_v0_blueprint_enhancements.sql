-- ----------------------------------------------------------------------------
-- MEYALO DATABASE MIGRATION 002: V0 BLUEPRINT SCHEMAS & TRUST LIFECYCLE
-- Blueprint Reference: Section 8.1 & Section 21 (1 September 2026)
-- ----------------------------------------------------------------------------

-- 1. Create event lifecycle status type safely if not existing
DO $$ BEGIN
    CREATE TYPE public.event_status AS ENUM (
      'draft',
      'published',
      'updated',
      'cancelled',
      'ended',
      'needs_review'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add Blueprint required fields to public.events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS status public.event_status DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'WAT',
  ADD COLUMN IF NOT EXISTS registration_url TEXT,
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'official_website',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS virtual_access_type TEXT,
  ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';

-- 3. Create high-performance indexes for status, category, and timestamps
CREATE INDEX IF NOT EXISTS idx_events_status_start_at ON public.events (status, start_at);
CREATE INDEX IF NOT EXISTS idx_events_topics ON public.events USING GIN (topics);

-- 4. Update Row Level Security Policy to restrict discovery strictly to published events
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
DROP POLICY IF EXISTS "Allow public read access to published events" ON public.events;

CREATE POLICY "Allow public read access to published events"
  ON public.events
  FOR SELECT
  USING (status = 'published');
