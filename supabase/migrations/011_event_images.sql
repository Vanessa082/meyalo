-- ----------------------------------------------------------------------------
-- MEYALO 011: EVENT IMAGES
-- A curator may add an image only with the right to use it (docs/
-- product-decisions.md, "Spec: event images"). Files live in the public
-- event-images bucket; only curators can write there.
-- Tested by supabase/tests/08_event_images.test.sql.
-- ----------------------------------------------------------------------------

ALTER TABLE public.events
  -- Storage path prefix; the files are <path>-640.webp and <path>-1600.webp.
  ADD COLUMN IF NOT EXISTS cover_image_path TEXT
    CHECK (char_length(cover_image_path) <= 200),
  -- Why we may use it. Curators only; never public.
  ADD COLUMN IF NOT EXISTS cover_image_rights TEXT
    CHECK (cover_image_rights IN ('organizer_provided', 'source_permits', 'own_photo')),
  -- What the image shows, for screen readers.
  ADD COLUMN IF NOT EXISTS cover_image_alt TEXT
    CHECK (char_length(cover_image_alt) BETWEEN 3 AND 200),
  ADD COLUMN IF NOT EXISTS cover_image_credit TEXT
    CHECK (char_length(cover_image_credit) <= 120);

-- An image never exists without its rights and alt text, and they never
-- outlive it.
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_cover_image_complete;
ALTER TABLE public.events ADD CONSTRAINT events_cover_image_complete CHECK (
  (cover_image_path IS NULL AND cover_image_rights IS NULL
    AND cover_image_alt IS NULL AND cover_image_credit IS NULL)
  OR (cover_image_path IS NOT NULL AND cover_image_rights IS NOT NULL
    AND cover_image_alt IS NOT NULL)
);

-- The public view gains the image, its alt text and credit (not the rights).
-- New columns go at the end, as CREATE OR REPLACE VIEW requires.
CREATE OR REPLACE VIEW public.events_public
WITH (security_invoker = true)
AS
SELECT
  id, title, description, format, category, start_at, end_at, timezone,
  registration_deadline, city, country_code, venue_name, address, latitude,
  longitude, virtual_access_type, organizer_id, organizer_name, source_url,
  source_type, registration_url, price_type, currency, price_min, price_max,
  verification_state, publication_status, last_checked_at, created_at,
  updated_at,
  cover_image_path, cover_image_alt, cover_image_credit
FROM public.events
WHERE publication_status = 'published'
  AND verification_state IN ('source_confirmed', 'organizer_confirmed');

-- The view runs as the caller, so anon needs these base columns (008).
GRANT SELECT (cover_image_path, cover_image_alt, cover_image_credit)
  ON TABLE public.events TO anon;

-- The bucket. Public: published images are public anyway, and public URLs
-- cache well. Small files only; the console uploads resized WebP.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-images', 'event-images', true, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Only curators write; everyone reads through the public URL.
DROP POLICY IF EXISTS event_images_curator_read ON storage.objects;
CREATE POLICY event_images_curator_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'event-images' AND public.is_admin());

DROP POLICY IF EXISTS event_images_curator_insert ON storage.objects;
CREATE POLICY event_images_curator_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images' AND public.is_admin());

DROP POLICY IF EXISTS event_images_curator_update ON storage.objects;
CREATE POLICY event_images_curator_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'event-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'event-images' AND public.is_admin());

DROP POLICY IF EXISTS event_images_curator_delete ON storage.objects;
CREATE POLICY event_images_curator_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND public.is_admin());
