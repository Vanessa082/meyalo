-- ----------------------------------------------------------------------------
-- MEYALO 008: PUBLIC COLUMNS
-- Anonymous clients can no longer read curator or provenance columns of
-- events (checked_by, a curator's auth user id, and source_submission_id).
-- The app reads published events through events_public (006).
-- Tested by supabase/tests/05_public_columns.test.sql.
-- ----------------------------------------------------------------------------

-- events_public is security_invoker, so anon still needs SELECT on every
-- base column the view reads; revoking the whole table would break the view.
-- The RLS policies on event_topics, event_offers, event_languages,
-- event_translations, organizers and reports also read events as the caller.
-- Column grants are listed by name: a column added to events later stays
-- hidden from anon until it is granted here.
REVOKE SELECT ON TABLE public.events FROM anon;
GRANT SELECT (
  id,
  title,
  description,
  format,
  category,
  start_at,
  end_at,
  timezone,
  registration_deadline,
  city,
  country_code,
  venue_name,
  address,
  latitude,
  longitude,
  virtual_access_type,
  organizer_id,
  organizer_name,
  source_url,
  source_type,
  registration_url,
  price_type,
  currency,
  price_min,
  price_max,
  verification_state,
  publication_status,
  last_checked_at,
  created_at,
  updated_at
) ON TABLE public.events TO anon;

-- Not covered here: authenticated keeps table SELECT because curators are
-- authenticated and need checked_by. A signed-in non-curator can therefore
-- still read those columns of published events from the table. Closing that
-- needs curator reads through a separate path (a SECURITY DEFINER function
-- or a curator-only view) before the columns can be revoked from
-- authenticated.
