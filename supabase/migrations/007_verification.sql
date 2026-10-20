-- ----------------------------------------------------------------------------
-- MEYALO 007: VERIFICATION MODEL
-- An evidence trail for every check, rules enforced by the database, and an
-- automatic step back to review when several people report a scam.
-- Decisions: docs/product-decisions.md, "Provenance & verification".
-- Tested by supabase/tests/04_verification.test.sql.
-- ----------------------------------------------------------------------------

-- 1. Partner organizers (signed partnership, known contact). Curators set it;
--    it is public so the app can show a partner badge.
ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS is_partner BOOLEAN NOT NULL DEFAULT false;

-- 2. The evidence trail. One row per check, never edited or deleted by
--    clients, readable by curators only (it can name curators and hold notes).
DO $$ BEGIN
  CREATE TYPE public.check_method AS ENUM (
    'official_site',
    'official_social',
    'organizer_contact',
    'partner_feed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.check_outcome AS ENUM ('confirmed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.event_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  checked_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id),
  method public.check_method NOT NULL,
  outcome public.check_outcome NOT NULL,
  -- The verification state the check asked for.
  state public.verification_state NOT NULL,
  evidence_url TEXT NOT NULL,
  red_flags TEXT[] NOT NULL DEFAULT '{}',
  charges_fee BOOLEAN NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_checks_evidence_https CHECK (
    evidence_url ~ '^https://' AND char_length(evidence_url) <= 2000
  ),
  -- Kept in sync with RED_FLAGS in src/services/event-domain.ts.
  CONSTRAINT event_checks_red_flags_known CHECK (
    red_flags <@ ARRAY[
      'guaranteed_award',
      'payment_to_personal_account',
      'free_email_contact_only',
      'lookalike_domain',
      'pressure_to_pay_or_decide',
      'asks_card_or_bank_details'
    ]::TEXT[]
  ),
  CONSTRAINT event_checks_notes_length CHECK (
    notes IS NULL OR char_length(notes) <= 2000
  ),
  CONSTRAINT event_checks_confirmed_is_clean CHECK (
    outcome <> 'confirmed' OR cardinality(red_flags) = 0
  ),
  CONSTRAINT event_checks_state_matches_outcome CHECK (
    (outcome = 'confirmed' AND state IN ('source_confirmed', 'organizer_confirmed'))
    OR (outcome = 'rejected' AND state = 'unreviewed')
  ),
  CONSTRAINT event_checks_organizer_needs_contact CHECK (
    state <> 'organizer_confirmed' OR method = 'organizer_contact'
  )
);

CREATE INDEX IF NOT EXISTS idx_event_checks_event_created
  ON public.event_checks (event_id, created_at DESC);

ALTER TABLE public.event_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_checks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.event_checks TO authenticated;
GRANT ALL ON TABLE public.event_checks TO service_role;

DROP POLICY IF EXISTS event_checks_admin_select ON public.event_checks;
CREATE POLICY event_checks_admin_select ON public.event_checks
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS event_checks_admin_insert ON public.event_checks;
CREATE POLICY event_checks_admin_insert ON public.event_checks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND checked_by = auth.uid());

-- 3. Verification changes only through record_check. The curation guard from
--    005 is extended: a client session may change verification_state, and
--    who checked and when, only while record_check has marked the
--    transaction. So a check date always has an evidence row behind it.
--    Everything else in the guard is unchanged.
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

  IF (NEW.verification_state IS DISTINCT FROM OLD.verification_state
      OR NEW.last_checked_at IS DISTINCT FROM OLD.last_checked_at
      OR NEW.checked_by IS DISTINCT FROM OLD.checked_by)
    AND auth.uid() IS NOT NULL
    AND current_setting('meyalo.recording_check', true) IS DISTINCT FROM 'on'
  THEN
    RAISE EXCEPTION 'record verification with record_check'
      USING ERRCODE = '42501';
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

-- 4. Record a check and apply it, in one transaction.
--    Returns 'confirmed', 'needs_second_review' or 'rejected'.
--    SECURITY INVOKER: RLS on events and event_checks still applies.
--    Rules (fail closed):
--    - curators only;
--    - a check with any red flag cannot confirm (constraint on event_checks);
--    - organizer confirmation needs contact with the organizer (constraint);
--    - if any check of the event found a fee, confirming needs confirmations
--      from two different curators; until then the event is not confirmed,
--      and an already confirmed event drops back to review;
--    - a rejection makes the event unreviewed and takes a published event
--      back to review.
CREATE OR REPLACE FUNCTION public.record_check(
  p_event_id UUID,
  p_state public.verification_state,
  p_method public.check_method,
  p_evidence_url TEXT,
  p_red_flags TEXT[],
  p_charges_fee BOOLEAN,
  p_notes TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_outcome public.check_outcome;
  v_publication public.publication_status;
  v_verification public.verification_state;
  v_fee BOOLEAN;
  v_confirmers INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'only curators can record checks' USING ERRCODE = '42501';
  END IF;

  SELECT publication_status, verification_state
  INTO v_publication, v_verification
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found' USING ERRCODE = 'P0002';
  END IF;

  v_outcome := CASE
    WHEN p_state = 'unreviewed' THEN 'rejected'::public.check_outcome
    ELSE 'confirmed'::public.check_outcome
  END;

  INSERT INTO public.event_checks (
    event_id, method, outcome, state, evidence_url, red_flags, charges_fee,
    notes
  ) VALUES (
    p_event_id, p_method, v_outcome, p_state, p_evidence_url,
    COALESCE(p_red_flags, '{}'), p_charges_fee, NULLIF(trim(p_notes), '')
  );

  PERFORM set_config('meyalo.recording_check', 'on', true);

  IF v_outcome = 'rejected' THEN
    UPDATE public.events
    SET verification_state = 'unreviewed',
        publication_status = CASE
          WHEN publication_status = 'published' THEN 'under_review'
          ELSE publication_status
        END
    WHERE id = p_event_id;
    PERFORM set_config('meyalo.recording_check', 'off', true);
    RETURN 'rejected';
  END IF;

  SELECT bool_or(charges_fee) INTO v_fee
  FROM public.event_checks
  WHERE event_id = p_event_id;

  IF v_fee THEN
    SELECT count(DISTINCT checked_by) INTO v_confirmers
    FROM public.event_checks
    WHERE event_id = p_event_id AND outcome = 'confirmed';
    IF v_confirmers < 2 THEN
      IF v_verification <> 'unreviewed' THEN
        UPDATE public.events
        SET verification_state = 'unreviewed',
            publication_status = CASE
              WHEN publication_status = 'published' THEN 'under_review'
              ELSE publication_status
            END
        WHERE id = p_event_id;
      END IF;
      PERFORM set_config('meyalo.recording_check', 'off', true);
      RETURN 'needs_second_review';
    END IF;
  END IF;

  -- Setting the check time always counts as a change, so a re-check of an
  -- already confirmed event still records who checked and when.
  UPDATE public.events
  SET verification_state = p_state,
      last_checked_at = clock_timestamp()
  WHERE id = p_event_id;
  PERFORM set_config('meyalo.recording_check', 'off', true);
  RETURN 'confirmed';
END;
$$;

REVOKE ALL ON FUNCTION public.record_check(
  UUID, public.verification_state, public.check_method, TEXT, TEXT[], BOOLEAN, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_check(
  UUID, public.verification_state, public.check_method, TEXT, TEXT[], BOOLEAN, TEXT
) TO authenticated, service_role;

-- 5. Two scam reports within 24 hours send a published event back to review,
--    before a curator looks. Not for events confirmed by their organizer, and
--    not for partner organizers: anonymous reports must not be able to take
--    down trusted organizers. A signed-in reporter counts once; anonymous
--    reports cannot be told apart (no identity), which the 006 rate limit
--    bounds. SECURITY DEFINER: reporters cannot read reports or edit events.
CREATE OR REPLACE FUNCTION public.review_on_scam_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporters INTEGER;
BEGIN
  IF NEW.reason <> 'scam' THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT COALESCE(reporter_user_id::TEXT, id::TEXT))
  INTO v_reporters
  FROM public.reports
  WHERE event_id = NEW.event_id
    AND reason = 'scam'
    AND created_at > now() - interval '24 hours';

  IF v_reporters >= 2 THEN
    UPDATE public.events e
    SET publication_status = 'under_review'
    WHERE e.id = NEW.event_id
      AND e.publication_status = 'published'
      AND e.verification_state <> 'organizer_confirmed'
      AND NOT EXISTS (
        SELECT 1 FROM public.organizers o
        WHERE o.id = e.organizer_id AND o.is_partner
      );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.review_on_scam_reports() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS reports_review_on_scam ON public.reports;
CREATE TRIGGER reports_review_on_scam
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.review_on_scam_reports();
