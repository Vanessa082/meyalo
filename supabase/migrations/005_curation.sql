-- ----------------------------------------------------------------------------
-- MEYALO 005: CURATION WRITES
-- Publication transitions, who-checked-when, and one transaction per event save.
-- Additive. Does not change 003/004 policies.
-- ----------------------------------------------------------------------------

-- 1. A check date is set only when someone records a check.
ALTER TABLE public.events ALTER COLUMN last_checked_at DROP DEFAULT;

UPDATE public.events
SET last_checked_at = NULL,
    checked_by = NULL
WHERE verification_state = 'unreviewed';

-- 2. Publication transitions. Kept in sync with PUBLICATION_TRANSITIONS in
--    src/services/event-domain.ts.
CREATE OR REPLACE FUNCTION public.publication_transition_allowed(
  from_status public.publication_status,
  to_status public.publication_status
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT from_status = to_status
    OR (from_status::text, to_status::text) IN (
      ('draft', 'published'),
      ('draft', 'under_review'),
      ('draft', 'cancelled'),
      ('under_review', 'published'),
      ('under_review', 'draft'),
      ('under_review', 'cancelled'),
      ('published', 'under_review'),
      ('published', 'cancelled'),
      ('published', 'ended'),
      ('cancelled', 'draft')
    );
$$;

-- Client sessions (auth.uid() set) create unreviewed drafts only, and the
-- check date and checker come from the server, not the client. Service-role
-- jobs and seeds (auth.uid() null) are not restricted by the insert rule.
CREATE OR REPLACE FUNCTION public.guard_event_curation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      IF NEW.publication_status <> 'draft'
        OR NEW.verification_state <> 'unreviewed'
      THEN
        RAISE EXCEPTION 'new events start as unreviewed drafts'
          USING ERRCODE = '23514';
      END IF;
      NEW.last_checked_at = NULL;
      NEW.checked_by = NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT public.publication_transition_allowed(
    OLD.publication_status,
    NEW.publication_status
  ) THEN
    RAISE EXCEPTION 'publication status cannot change from % to %',
      OLD.publication_status, NEW.publication_status
      USING ERRCODE = '23514';
  END IF;

  IF NEW.verification_state IS DISTINCT FROM OLD.verification_state
    OR NEW.last_checked_at IS DISTINCT FROM OLD.last_checked_at
    OR NEW.checked_by IS DISTINCT FROM OLD.checked_by
  THEN
    IF NEW.verification_state = 'unreviewed' THEN
      NEW.last_checked_at = NULL;
      NEW.checked_by = NULL;
    ELSIF auth.uid() IS NOT NULL THEN
      NEW.last_checked_at = now();
      NEW.checked_by = auth.uid();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_guard_curation ON public.events;
CREATE TRIGGER events_guard_curation
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_curation();

-- 3. Save an event and its topics, offers and languages in one transaction.
--    SECURITY INVOKER: RLS on events and the junction tables still applies.
--    Publication and verification are not written here; they change through
--    their own updates so the transition guard and check recording apply.
CREATE OR REPLACE FUNCTION public.save_event(
  p_event_id UUID,
  p_expected_updated_at TIMESTAMPTZ,
  p_event JSONB,
  p_topics TEXT[],
  p_offers TEXT[],
  p_languages TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  input public.events;
  saved_id UUID;
  organizer UUID;
  organizer_label TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'curator role required' USING ERRCODE = '42501';
  END IF;

  input := jsonb_populate_record(NULL::public.events, p_event);

  organizer_label := nullif(trim(input.organizer_name), '');
  IF organizer_label IS NULL THEN
    RAISE EXCEPTION 'organizer name is required' USING ERRCODE = '23502';
  END IF;

  SELECT id INTO organizer
  FROM public.organizers
  WHERE lower(name) = lower(organizer_label)
  ORDER BY created_at, id
  LIMIT 1;

  IF organizer IS NULL THEN
    INSERT INTO public.organizers (name)
    VALUES (organizer_label)
    RETURNING id INTO organizer;
  END IF;

  IF p_event_id IS NULL THEN
    INSERT INTO public.events (
      title, description, category, format,
      start_at, end_at, timezone, registration_deadline,
      city, country_code, venue_name, address, latitude, longitude,
      virtual_access_type,
      organizer_id, organizer_name,
      source_url, source_type, registration_url,
      price_type, currency, price_min, price_max
    )
    VALUES (
      input.title, input.description, input.category, input.format,
      input.start_at, input.end_at, input.timezone, input.registration_deadline,
      input.city, input.country_code, input.venue_name, input.address,
      input.latitude, input.longitude,
      input.virtual_access_type,
      organizer, organizer_label,
      input.source_url, input.source_type, input.registration_url,
      input.price_type, input.currency, input.price_min, input.price_max
    )
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.events
    SET
      title = input.title,
      description = input.description,
      category = input.category,
      format = input.format,
      start_at = input.start_at,
      end_at = input.end_at,
      timezone = input.timezone,
      registration_deadline = input.registration_deadline,
      city = input.city,
      country_code = input.country_code,
      venue_name = input.venue_name,
      address = input.address,
      latitude = input.latitude,
      longitude = input.longitude,
      virtual_access_type = input.virtual_access_type,
      organizer_id = organizer,
      organizer_name = organizer_label,
      source_url = input.source_url,
      source_type = input.source_type,
      registration_url = input.registration_url,
      price_type = input.price_type,
      currency = input.currency,
      price_min = input.price_min,
      price_max = input.price_max
    WHERE id = p_event_id
      AND updated_at = p_expected_updated_at
    RETURNING id INTO saved_id;

    IF saved_id IS NULL THEN
      IF EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id) THEN
        RAISE EXCEPTION 'event changed since it was loaded'
          USING ERRCODE = '40001';
      END IF;
      RAISE EXCEPTION 'event not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  DELETE FROM public.event_topics WHERE event_id = saved_id;
  INSERT INTO public.event_topics (event_id, topic_id)
  SELECT DISTINCT saved_id, topic
  FROM unnest(COALESCE(p_topics, '{}')) AS topic;

  DELETE FROM public.event_offers WHERE event_id = saved_id;
  INSERT INTO public.event_offers (event_id, offer_id)
  SELECT DISTINCT saved_id, offer
  FROM unnest(COALESCE(p_offers, '{}')) AS offer;

  DELETE FROM public.event_languages WHERE event_id = saved_id;
  INSERT INTO public.event_languages (event_id, language_code)
  SELECT DISTINCT saved_id, language
  FROM unnest(COALESCE(p_languages, '{}')) AS language;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_event(UUID, TIMESTAMPTZ, JSONB, TEXT[], TEXT[], TEXT[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_event(UUID, TIMESTAMPTZ, JSONB, TEXT[], TEXT[], TEXT[])
  TO authenticated, service_role;

-- 4. Curation list ordering and the "updated recently" view.
CREATE INDEX IF NOT EXISTS idx_events_start_id
  ON public.events (start_at, id);
CREATE INDEX IF NOT EXISTS idx_events_updated_id
  ON public.events (updated_at, id);
