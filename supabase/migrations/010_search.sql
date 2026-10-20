-- Explore search (docs/product-decisions.md, Feature 7 spec).
-- One function holds every rule, so the app, the web and any later client
-- search the same way. Ordering, paging and counting are left to the caller
-- (PostgREST), which keeps this function a plain filter.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- "Recently added" sorts and pages on created_at, which needs a value on
-- every row (nulls would sort first and break paging). It has defaulted to
-- now() since it was added. If this fails because old rows have no value,
-- set them first, deliberately, for example to their updated_at.
ALTER TABLE public.events ALTER COLUMN created_at SET NOT NULL;

-- unaccent() is only STABLE; naming the dictionary makes this wrapper safe to
-- mark IMMUTABLE, so it can back an index later if search gets slow.
CREATE OR REPLACE FUNCTION public.search_text(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, '')))
$$;

CREATE OR REPLACE FUNCTION public.search_public_events(
  query TEXT DEFAULT NULL,
  -- Topic ids whose French or English name contains the query. Topic names
  -- live in the app's translations, so the app works these out.
  query_topics TEXT[] DEFAULT NULL,
  cities TEXT[] DEFAULT NULL,
  formats TEXT[] DEFAULT NULL,
  -- 'free' (free or free with registration), 'paid' (paid or varying).
  -- A price that is not stated matches neither.
  prices TEXT[] DEFAULT NULL,
  topics TEXT[] DEFAULT NULL,
  offers TEXT[] DEFAULT NULL,
  languages TEXT[] DEFAULT NULL,
  registration_open BOOLEAN DEFAULT false,
  starts_from TIMESTAMPTZ DEFAULT NULL,
  starts_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF public.events_public
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH words AS (
    SELECT array_remove(
      regexp_split_to_array(public.search_text(btrim(left(query, 100))), '\s+'),
      ''
    ) AS list
  )
  SELECT event.*
  FROM public.events_public AS event, words
  WHERE event.publication_status = 'published'
    AND event.verification_state IN ('source_confirmed', 'organizer_confirmed')
    -- Past events never appear: shown until the end, or the start if no end.
    AND coalesce(event.end_at, event.start_at) >= now()
    AND (starts_from IS NULL OR event.start_at >= starts_from)
    AND (starts_before IS NULL OR event.start_at < starts_before)
    AND (coalesce(cardinality(cities), 0) = 0 OR public.search_text(event.city) IN (
      SELECT public.search_text(city) FROM unnest(cities) AS city))
    AND (coalesce(cardinality(formats), 0) = 0 OR event.format = ANY (formats))
    AND (coalesce(cardinality(prices), 0) = 0
      OR ('free' = ANY (prices)
        AND event.price_type IN ('free', 'free_with_registration'))
      OR ('paid' = ANY (prices) AND event.price_type IN ('paid', 'variable')))
    AND (coalesce(cardinality(topics), 0) = 0 OR EXISTS (
      SELECT 1 FROM public.event_topics AS link
      WHERE link.event_id = event.id AND link.topic_id = ANY (topics)))
    AND (coalesce(cardinality(offers), 0) = 0 OR EXISTS (
      SELECT 1 FROM public.event_offers AS link
      WHERE link.event_id = event.id AND link.offer_id = ANY (offers)))
    AND (coalesce(cardinality(languages), 0) = 0 OR EXISTS (
      SELECT 1 FROM public.event_languages AS link
      WHERE link.event_id = event.id AND link.language_code = ANY (languages)))
    AND (NOT registration_open
      OR event.registration_deadline IS NULL
      OR event.registration_deadline > now())
    AND (
      cardinality(words.list) = 0
      -- Every word appears somewhere. strpos is plain text: % and _ are not
      -- patterns here.
      OR NOT EXISTS (
        SELECT 1 FROM unnest(words.list) AS word
        WHERE strpos(
          public.search_text(concat_ws(' ', event.title, event.description,
            event.organizer_name, event.venue_name, event.city)),
          word
        ) = 0
      )
      OR (coalesce(cardinality(query_topics), 0) > 0 AND EXISTS (
        SELECT 1 FROM public.event_topics AS link
        WHERE link.event_id = event.id AND link.topic_id = ANY (query_topics)))
    )
$$;

REVOKE ALL ON FUNCTION public.search_public_events(
  TEXT, TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], BOOLEAN,
  TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_events(
  TEXT, TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], BOOLEAN,
  TIMESTAMPTZ, TIMESTAMPTZ
) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_text(TEXT)
  TO anon, authenticated, service_role;
