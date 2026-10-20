-- ----------------------------------------------------------------------------
-- MEYALO 013: ACCOUNTS
-- Optional accounts back up plans and the discovery profile across phones
-- (docs/product-decisions.md, "Spec: accounts"). Each person reads and writes
-- only their own rows; nothing is stored before consent; for one event each
-- field keeps its latest change. Deleting the auth user removes everything
-- here (ON DELETE CASCADE) except an anonymous deletion record.
-- Tested by supabase/tests/10_accounts.test.sql.
-- ----------------------------------------------------------------------------

-- 1. Consent to having an account, append-only, in the same shape as 012.
CREATE TABLE IF NOT EXISTS public.account_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL CHECK (char_length(consent_version) <= 40),
  consent_language TEXT NOT NULL CHECK (consent_language IN ('en', 'fr')),
  age_group TEXT NOT NULL CHECK (age_group IN ('18_plus', 'under_18')),
  guardian_consent BOOLEAN,
  consented_at TIMESTAMPTZ,
  CONSTRAINT account_consents_guardian CHECK (
    age_group = '18_plus' OR guardian_consent IS TRUE
  )
);
CREATE INDEX IF NOT EXISTS idx_account_consents_user
  ON public.account_consents (user_id);

-- The server says when (012's function).
DROP TRIGGER IF EXISTS account_consents_stamp ON public.account_consents;
CREATE TRIGGER account_consents_stamp
  BEFORE INSERT ON public.account_consents
  FOR EACH ROW EXECUTE FUNCTION public.stamp_consent_time();

ALTER TABLE public.account_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.account_consents TO authenticated;
GRANT ALL ON TABLE public.account_consents TO service_role;

DROP POLICY IF EXISTS account_consents_own_select ON public.account_consents;
CREATE POLICY account_consents_own_select ON public.account_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS account_consents_own_insert ON public.account_consents;
CREATE POLICY account_consents_own_insert ON public.account_consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. The discovery profile, as the phone keeps it (area, format, interests,
--    goals), with the time of its last edit.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discovery JSONB,
  ADD COLUMN IF NOT EXISTS discovery_updated_at TIMESTAMPTZ;

-- 3. Plans: when each field last changed, the "Did you go?" answer, and
--    removals (kept so another phone does not bring a removed plan back).
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS state_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS registered_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attended BOOLEAN,
  ADD COLUMN IF NOT EXISTS attended_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- 4. Personal rows are the owner's only. Curators review events, not people:
--    004 also let admins read and change these.
DROP POLICY IF EXISTS plans_own ON public.plans;
CREATE POLICY plans_own ON public.plans
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_own ON public.profiles;
CREATE POLICY profiles_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- A client session always owns the plans it writes (003 let admins write
-- anyone's). Server jobs, with no client role, keep the owner they give.
CREATE OR REPLACE FUNCTION public.protect_plan_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.jwt() ->> 'role' IN ('anon', 'authenticated') THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Sync: the phone sends what changed, the server keeps per field the
--    later change, and answers with everything the account holds.
--    SECURITY INVOKER: row level security applies to every read and write.
--    Limits: 500 plans per call, 2000 per account, 8 KB per snapshot and
--    profile, change times at most a day ahead of the server clock.
CREATE OR REPLACE FUNCTION public.sync_account(p_plans JSONB, p_profile JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  latest_allowed TIMESTAMPTZ := now() + interval '1 day';
  item JSONB;
  current_plan public.plans%ROWTYPE;
  v_event UUID;
  v_state TEXT;
  v_state_at TIMESTAMPTZ;
  v_registered_at TIMESTAMPTZ;
  v_attended_at TIMESTAMPTZ;
  v_snapshot JSONB;
  v_profile_at TIMESTAMPTZ;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to back up plans.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.account_consents WHERE user_id = uid) THEN
    RAISE EXCEPTION 'Consent is required before anything is stored.'
      USING ERRCODE = '42501';
  END IF;
  IF p_plans IS NULL OR jsonb_typeof(p_plans) <> 'array'
     OR jsonb_array_length(p_plans) > 500 THEN
    RAISE EXCEPTION 'Plans must be a list of at most 500.' USING ERRCODE = '22023';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_plans) LOOP
    v_event := (item ->> 'event_id')::UUID;
    v_state := item ->> 'state';
    v_state_at := (item ->> 'state_changed_at')::TIMESTAMPTZ;
    v_registered_at := (item ->> 'registered_changed_at')::TIMESTAMPTZ;
    v_attended_at := (item ->> 'attended_changed_at')::TIMESTAMPTZ;
    v_snapshot := item -> 'snapshot';

    IF v_state_at IS NULL OR (v_state IS NOT NULL AND v_state NOT IN ('saved', 'going')) THEN
      RAISE EXCEPTION 'Each plan needs a state and when it changed.' USING ERRCODE = '22023';
    END IF;
    IF greatest(v_state_at, v_registered_at, v_attended_at) > latest_allowed THEN
      RAISE EXCEPTION 'A change time is in the future.' USING ERRCODE = '22023';
    END IF;
    IF v_snapshot IS NOT NULL AND length(v_snapshot::TEXT) > 8192 THEN
      RAISE EXCEPTION 'An event copy is too large.' USING ERRCODE = '22023';
    END IF;

    -- An event that does not exist (any more) is skipped, not an error.
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM public.events WHERE id = v_event);

    SELECT * INTO current_plan FROM public.plans
    WHERE user_id = uid AND event_id = v_event
    FOR UPDATE;

    IF NOT FOUND THEN
      -- Removing what the account never had changes nothing.
      CONTINUE WHEN v_state IS NULL;
      IF (SELECT count(*) FROM public.plans WHERE user_id = uid) >= 2000 THEN
        RAISE EXCEPTION 'Too many plans in this account.' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.plans (
        user_id, event_id, state, state_changed_at, registered,
        registered_changed_at, attended, attended_changed_at, snapshot
      ) VALUES (
        uid, v_event, v_state, v_state_at,
        coalesce((item ->> 'registered')::BOOLEAN, false), v_registered_at,
        (item ->> 'attended')::BOOLEAN, v_attended_at,
        coalesce(v_snapshot, '{}'::JSONB)
      );
      CONTINUE;
    END IF;

    IF v_state_at > greatest(current_plan.state_changed_at, current_plan.removed_at) THEN
      IF v_state IS NULL THEN
        UPDATE public.plans SET removed_at = v_state_at, updated_at = now()
        WHERE id = current_plan.id;
      ELSE
        UPDATE public.plans
        SET state = v_state, state_changed_at = v_state_at, removed_at = NULL,
            snapshot = coalesce(v_snapshot, snapshot), updated_at = now()
        WHERE id = current_plan.id;
      END IF;
    END IF;
    IF v_registered_at IS NOT NULL
       AND v_registered_at > coalesce(current_plan.registered_changed_at, '-infinity') THEN
      UPDATE public.plans
      SET registered = coalesce((item ->> 'registered')::BOOLEAN, false),
          registered_changed_at = v_registered_at, updated_at = now()
      WHERE id = current_plan.id;
    END IF;
    IF v_attended_at IS NOT NULL
       AND v_attended_at > coalesce(current_plan.attended_changed_at, '-infinity') THEN
      UPDATE public.plans
      SET attended = (item ->> 'attended')::BOOLEAN,
          attended_changed_at = v_attended_at, updated_at = now()
      WHERE id = current_plan.id;
    END IF;
  END LOOP;

  IF p_profile IS NOT NULL THEN
    v_profile_at := (p_profile ->> 'updated_at')::TIMESTAMPTZ;
    IF v_profile_at IS NULL OR v_profile_at > latest_allowed
       OR jsonb_typeof(p_profile -> 'discovery') <> 'object'
       OR length((p_profile -> 'discovery')::TEXT) > 8192 THEN
      RAISE EXCEPTION 'The profile is not valid.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.profiles
    SET discovery = p_profile -> 'discovery', discovery_updated_at = v_profile_at,
        updated_at = now()
    WHERE id = uid
      AND (discovery_updated_at IS NULL OR discovery_updated_at < v_profile_at);
  END IF;

  RETURN jsonb_build_object(
    'plans', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'event_id', p.event_id, 'state', p.state,
        'state_changed_at', p.state_changed_at, 'removed_at', p.removed_at,
        'registered', p.registered, 'registered_changed_at', p.registered_changed_at,
        'attended', p.attended, 'attended_changed_at', p.attended_changed_at,
        'snapshot', p.snapshot
      ))
      FROM public.plans AS p WHERE p.user_id = uid), '[]'::JSONB),
    'profile', (
      SELECT jsonb_build_object(
        'discovery', pr.discovery, 'updated_at', pr.discovery_updated_at)
      FROM public.profiles AS pr WHERE pr.id = uid)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_account(JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_account(JSONB, JSONB) TO authenticated, service_role;

-- 6. What is kept after an account is deleted: nothing that identifies the
--    person. Written by the delete-account function (service role) only.
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL CHECK (char_length(user_hash) = 64),
  account_created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_versions TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL CHECK (source IN ('app', 'web'))
);
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_deletions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.account_deletions TO service_role;
