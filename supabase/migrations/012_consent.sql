-- ----------------------------------------------------------------------------
-- MEYALO 012: CONSENT
-- Reports and suggestions carry the consent they were sent with (docs/
-- product-decisions.md, "Spec: consent, privacy settings and notifications";
-- docs/consent-cameroon.md). None is stored without it; under 18 needs a
-- parent or guardian. Rows sent before this keep NULL consent fields.
-- Tested by supabase/tests/09_consent.test.sql.
-- ----------------------------------------------------------------------------

-- 1. The consent record, in the row it covers.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS consent_version TEXT CHECK (char_length(consent_version) <= 40),
  ADD COLUMN IF NOT EXISTS consent_language TEXT CHECK (consent_language IN ('en', 'fr')),
  ADD COLUMN IF NOT EXISTS age_group TEXT CHECK (age_group IN ('18_plus', 'under_18')),
  ADD COLUMN IF NOT EXISTS guardian_consent BOOLEAN,
  ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS consent_version TEXT CHECK (char_length(consent_version) <= 40),
  ADD COLUMN IF NOT EXISTS consent_language TEXT CHECK (consent_language IN ('en', 'fr')),
  ADD COLUMN IF NOT EXISTS age_group TEXT CHECK (age_group IN ('18_plus', 'under_18')),
  ADD COLUMN IF NOT EXISTS guardian_consent BOOLEAN,
  ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;

-- A consent record is complete, and under 18 includes the guardian.
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_consent_complete;
ALTER TABLE public.reports ADD CONSTRAINT reports_consent_complete CHECK (
  consent_version IS NULL
  OR (consent_language IS NOT NULL AND age_group IS NOT NULL
      AND (age_group = '18_plus' OR guardian_consent IS TRUE))
);
ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_consent_complete;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_consent_complete CHECK (
  consent_version IS NULL
  OR (consent_language IS NOT NULL AND age_group IS NOT NULL
      AND (age_group = '18_plus' OR guardian_consent IS TRUE))
);

-- The server, not the client, says when consent was given.
CREATE OR REPLACE FUNCTION public.stamp_consent_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.consented_at := CASE WHEN NEW.consent_version IS NULL THEN NULL ELSE now() END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reports_stamp_consent ON public.reports;
CREATE TRIGGER reports_stamp_consent
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.stamp_consent_time();
DROP TRIGGER IF EXISTS submissions_stamp_consent ON public.submissions;
CREATE TRIGGER submissions_stamp_consent
  BEFORE INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_consent_time();

-- 2. Reports: the insert rule from 006 plus consent.
DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert ON public.reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    consent_version IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events AS event
      WHERE event.id = reports.event_id
        AND event.publication_status = 'published'
        AND event.verification_state IN ('source_confirmed', 'organizer_confirmed')
    )
  );

-- 3. Suggestions: submit_event now requires consent; the old call goes.
DROP FUNCTION IF EXISTS public.submit_event(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.submit_event(
  p_source_url TEXT,
  p_raw_text TEXT,
  p_note TEXT,
  p_consent_version TEXT,
  p_consent_language TEXT,
  p_age_group TEXT,
  p_guardian_consent BOOLEAN
)
RETURNS TABLE (id UUID, access_token UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_consent_version IS NULL OR p_consent_language IS NULL OR p_age_group IS NULL THEN
    RAISE EXCEPTION 'Consent is required to send a suggestion.'
      USING ERRCODE = '22023';
  END IF;
  IF p_age_group = 'under_18' AND p_guardian_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'Under 18, a parent or guardian must agree.'
      USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  INSERT INTO public.submissions AS s (
    source_url, raw_text, note,
    consent_version, consent_language, age_group, guardian_consent
  )
  VALUES (
    NULLIF(trim(p_source_url), ''),
    NULLIF(trim(p_raw_text), ''),
    NULLIF(trim(p_note), ''),
    p_consent_version, p_consent_language, p_age_group, p_guardian_consent
  )
  RETURNING s.id, s.access_token;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
  TO anon, authenticated, service_role;
