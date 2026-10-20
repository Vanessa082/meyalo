-- ----------------------------------------------------------------------------
-- MEYALO 015: PLANS WITH FRIENDS
-- Feature 13 (docs/product-decisions.md, updated 2026-10-20). A signed-in
-- owner with account consent creates a private plan for an event and shares
-- its link. Friends answer with a first name, without an account, only
-- through the link token. Friends see counts; names only when the owner
-- shows them, and then only answers given while names were shown. Plans and
-- answers are deleted 1 day after the event (apply_retention).
-- Tested by supabase/tests/12_friend_plans.test.sql.
-- ----------------------------------------------------------------------------

-- 1. Plans.
ALTER TABLE public.friend_plans
  ADD COLUMN IF NOT EXISTS owner_name TEXT CHECK (char_length(owner_name) BETWEEN 1 AND 40),
  ADD COLUMN IF NOT EXISTS show_names BOOLEAN NOT NULL DEFAULT false;

-- One open plan per owner and event.
CREATE UNIQUE INDEX IF NOT EXISTS friend_plans_one_open
  ON public.friend_plans (owner_user_id, event_id) WHERE NOT closed;
CREATE INDEX IF NOT EXISTS idx_friend_plans_expires
  ON public.friend_plans (expires_at);

-- The owner reads, closes, shows or hides names, and deletes; creation goes
-- through create_friend_plan. Curators have no access (004 gave them all).
REVOKE ALL ON TABLE public.friend_plans FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.friend_plans TO authenticated;
GRANT UPDATE (closed, show_names) ON TABLE public.friend_plans TO authenticated;
GRANT ALL ON TABLE public.friend_plans TO service_role;

DROP POLICY IF EXISTS friend_plans_own ON public.friend_plans;
CREATE POLICY friend_plans_own ON public.friend_plans
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- 2. Answers: a token so a friend can change or remove their own, whether
--    names were shown when they answered, and the consent given.
ALTER TABLE public.friend_plan_responses
  ADD COLUMN IF NOT EXISTS response_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS name_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS consent_version TEXT CHECK (char_length(consent_version) <= 40),
  ADD COLUMN IF NOT EXISTS consent_language TEXT CHECK (consent_language IN ('en', 'fr')),
  ADD COLUMN IF NOT EXISTS age_group TEXT CHECK (age_group IN ('18_plus', 'under_18')),
  ADD COLUMN IF NOT EXISTS guardian_consent BOOLEAN,
  ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;

ALTER TABLE public.friend_plan_responses
  DROP CONSTRAINT IF EXISTS friend_plan_responses_consent_complete;
ALTER TABLE public.friend_plan_responses
  ADD CONSTRAINT friend_plan_responses_consent_complete CHECK (
    consent_version IS NOT NULL AND consent_language IS NOT NULL
    AND age_group IS NOT NULL
    AND (age_group = '18_plus' OR guardian_consent IS TRUE)
  );

DROP TRIGGER IF EXISTS friend_plan_responses_stamp ON public.friend_plan_responses;
CREATE TRIGGER friend_plan_responses_stamp
  BEFORE INSERT OR UPDATE ON public.friend_plan_responses
  FOR EACH ROW EXECUTE FUNCTION public.stamp_consent_time();

DROP POLICY IF EXISTS friend_plan_responses_owner_select ON public.friend_plan_responses;
CREATE POLICY friend_plan_responses_owner_select ON public.friend_plan_responses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.friend_plans AS plan
    WHERE plan.id = friend_plan_id AND plan.owner_user_id = auth.uid()
  ));

-- 3. Create a plan.
CREATE OR REPLACE FUNCTION public.create_friend_plan(
  p_event_id UUID,
  p_owner_name TEXT,
  p_show_names BOOLEAN
)
RETURNS TABLE (id UUID, token UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  name TEXT := NULLIF(trim(p_owner_name), '');
  ends TIMESTAMPTZ;
BEGIN
  IF uid IS NULL OR coalesce((auth.jwt() ->> 'is_anonymous')::BOOLEAN, false) THEN
    RAISE EXCEPTION 'Sign in to invite friends.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.account_consents WHERE user_id = uid) THEN
    RAISE EXCEPTION 'Consent is required before anything is stored.'
      USING ERRCODE = '42501';
  END IF;
  IF char_length(name) > 40 THEN
    RAISE EXCEPTION 'A first name is at most 40 characters.' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(e.end_at, e.start_at + interval '2 hours') INTO ends
  FROM public.events AS e
  WHERE e.id = p_event_id
    AND e.publication_status = 'published'
    AND e.verification_state IN ('source_confirmed', 'organizer_confirmed');
  IF ends IS NULL OR ends < now() THEN
    RAISE EXCEPTION 'Plans are for published events that have not ended.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('friend_plans:' || uid::TEXT));
  IF (SELECT count(*) FROM public.friend_plans AS f
      WHERE f.owner_user_id = uid AND f.created_at > now() - interval '1 day') >= 20 THEN
    RAISE EXCEPTION 'Too many plans today, try again tomorrow.' USING ERRCODE = 'PT429';
  END IF;

  RETURN QUERY
  INSERT INTO public.friend_plans AS f
    (owner_user_id, event_id, owner_name, show_names, expires_at)
  VALUES (uid, p_event_id, name, coalesce(p_show_names, false), ends + interval '1 day')
  RETURNING f.id, f.token, f.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_friend_plan(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_friend_plan(UUID, TEXT, BOOLEAN) TO authenticated;

-- 4. What a friend with the link sees. Unknown or expired: nothing.
CREATE OR REPLACE FUNCTION public.get_friend_plan(p_token UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
      'title', e.title, 'start_at', e.start_at, 'end_at', e.end_at,
      'timezone', e.timezone, 'format', e.format, 'city', e.city,
      'venue_name', e.venue_name, 'event_id', e.id,
      'owner_name', f.owner_name, 'show_names', f.show_names,
      'status', CASE WHEN f.closed THEN 'closed' ELSE 'open' END,
      'counts', jsonb_build_object(
        'in', (SELECT count(*) FROM public.friend_plan_responses r WHERE r.friend_plan_id = f.id AND r.answer = 'in'),
        'maybe', (SELECT count(*) FROM public.friend_plan_responses r WHERE r.friend_plan_id = f.id AND r.answer = 'maybe'),
        'cant', (SELECT count(*) FROM public.friend_plan_responses r WHERE r.friend_plan_id = f.id AND r.answer = 'cant')
      )
    )
    || CASE WHEN f.show_names THEN jsonb_build_object('names', coalesce((
         SELECT jsonb_agg(jsonb_build_object('name', r.first_name, 'answer', r.answer)
                          ORDER BY r.created_at)
         FROM public.friend_plan_responses r
         WHERE r.friend_plan_id = f.id AND r.name_visible), '[]'::JSONB))
       ELSE '{}'::JSONB END
  FROM public.friend_plans AS f
  JOIN public.events AS e ON e.id = f.event_id
  WHERE f.token = p_token
    AND (f.expires_at IS NULL OR f.expires_at > now());
$$;

REVOKE ALL ON FUNCTION public.get_friend_plan(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friend_plan(UUID) TO anon, authenticated;

-- 5. The 004 version took answers without consent; it goes.
DROP FUNCTION IF EXISTS public.respond_to_friend_plan(UUID, TEXT, TEXT);

-- 5. Answer, or change one's own answer with its token.
CREATE OR REPLACE FUNCTION public.respond_to_friend_plan(
  p_token UUID,
  p_first_name TEXT,
  p_answer TEXT,
  p_consent_version TEXT,
  p_consent_language TEXT,
  p_age_group TEXT,
  p_guardian_consent BOOLEAN,
  p_response_token UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.friend_plans%ROWTYPE;
  name TEXT := trim(coalesce(p_first_name, ''));
  guardian BOOLEAN := CASE WHEN p_age_group = 'under_18' THEN p_guardian_consent END;
  answer_token UUID;
BEGIN
  SELECT * INTO target FROM public.friend_plans AS f
  WHERE f.token = p_token AND NOT f.closed
    AND (f.expires_at IS NULL OR f.expires_at > now());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This plan is not taking answers.' USING ERRCODE = '22023';
  END IF;
  IF p_consent_version IS NULL OR p_consent_language IS NULL OR p_age_group IS NULL
     OR (p_age_group = 'under_18' AND p_guardian_consent IS NOT TRUE) THEN
    RAISE EXCEPTION 'Consent is required to answer.' USING ERRCODE = '22023';
  END IF;
  IF char_length(name) NOT BETWEEN 1 AND 40 OR p_answer NOT IN ('in', 'maybe', 'cant') THEN
    RAISE EXCEPTION 'Give a first name and an answer.' USING ERRCODE = '22023';
  END IF;

  IF p_response_token IS NOT NULL THEN
    UPDATE public.friend_plan_responses AS r
    SET first_name = name, answer = p_answer, name_visible = target.show_names,
        consent_version = p_consent_version, consent_language = p_consent_language,
        age_group = p_age_group, guardian_consent = guardian, updated_at = now()
    WHERE r.friend_plan_id = target.id AND r.response_token = p_response_token
    RETURNING r.response_token INTO answer_token;
    IF answer_token IS NOT NULL THEN
      RETURN answer_token;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('friend_plan_responses:' || target.id::TEXT));
  IF (SELECT count(*) FROM public.friend_plan_responses r WHERE r.friend_plan_id = target.id) >= 100
     OR (SELECT count(*) FROM public.friend_plan_responses r
         WHERE r.friend_plan_id = target.id AND r.created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'Too many answers for this plan, try again later.' USING ERRCODE = 'PT429';
  END IF;

  INSERT INTO public.friend_plan_responses AS r (
    friend_plan_id, first_name, answer, name_visible,
    consent_version, consent_language, age_group, guardian_consent
  ) VALUES (
    target.id, name, p_answer, target.show_names,
    p_consent_version, p_consent_language, p_age_group, guardian
  )
  RETURNING r.response_token INTO answer_token;
  RETURN answer_token;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_friend_plan(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_friend_plan(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID)
  TO anon, authenticated;

-- 6. A friend takes their answer back.
CREATE OR REPLACE FUNCTION public.remove_friend_plan_response(p_token UUID, p_response_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.friend_plan_responses AS r
  USING public.friend_plans AS f
  WHERE f.token = p_token AND r.friend_plan_id = f.id
    AND r.response_token = p_response_token;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_friend_plan_response(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_friend_plan_response(UUID, UUID) TO anon, authenticated;

-- 7. Retention (014) now also deletes expired plans; answers cascade.
CREATE OR REPLACE FUNCTION public.apply_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deletions INTEGER;
  reports INTEGER;
  suggestions INTEGER;
  notes INTEGER;
  friend_plans INTEGER;
BEGIN
  DELETE FROM public.account_deletions
  WHERE deleted_at < now() - interval '3 years';
  GET DIAGNOSTICS deletions = ROW_COUNT;

  DELETE FROM public.reports
  WHERE created_at < now() - interval '12 months';
  GET DIAGNOSTICS reports = ROW_COUNT;

  DELETE FROM public.submissions AS s
  WHERE s.status <> 'under_review'
    AND s.updated_at < now() - interval '12 months'
    AND NOT EXISTS (
      SELECT 1 FROM public.events AS e WHERE e.source_submission_id = s.id
    );
  GET DIAGNOSTICS suggestions = ROW_COUNT;

  UPDATE public.submissions AS s
  SET note = NULL
  WHERE s.status <> 'under_review'
    AND s.updated_at < now() - interval '12 months'
    AND s.note IS NOT NULL;
  GET DIAGNOSTICS notes = ROW_COUNT;

  DELETE FROM public.friend_plans WHERE expires_at < now();
  GET DIAGNOSTICS friend_plans = ROW_COUNT;

  RETURN jsonb_build_object(
    'deletion_records', deletions,
    'reports', reports,
    'suggestions', suggestions,
    'suggestion_notes', notes,
    'friend_plans', friend_plans
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_retention() TO service_role;
