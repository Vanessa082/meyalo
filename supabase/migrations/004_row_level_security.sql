-- ----------------------------------------------------------------------------
-- MEYALO 004: ROW LEVEL SECURITY
-- Admin is public.is_admin() (user_roles), never a hidden client check.
-- service_role bypasses RLS and is not granted to the app.
-- ----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Published events are readable by anyone. Everything else is admin-only.
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;

DROP POLICY IF EXISTS events_public_select ON public.events;
CREATE POLICY events_public_select ON public.events
  FOR SELECT TO anon, authenticated
  USING (
    publication_status = 'published'
    AND verification_state IN ('source_confirmed', 'organizer_confirmed')
  );

DROP POLICY IF EXISTS events_admin_all ON public.events;
CREATE POLICY events_admin_all ON public.events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Topic and offer catalogs are public reference data. Writes are admin-only.
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.topics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.topics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.topics TO authenticated;
GRANT ALL ON TABLE public.topics TO service_role;

DROP POLICY IF EXISTS topics_public_select ON public.topics;
CREATE POLICY topics_public_select ON public.topics
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS topics_admin_write ON public.topics;
CREATE POLICY topics_admin_write ON public.topics
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.offers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.offers TO authenticated;
GRANT ALL ON TABLE public.offers TO service_role;

DROP POLICY IF EXISTS offers_public_select ON public.offers;
CREATE POLICY offers_public_select ON public.offers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS offers_admin_write ON public.offers;
CREATE POLICY offers_admin_write ON public.offers
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.organizers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.organizers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.organizers TO authenticated;
GRANT ALL ON TABLE public.organizers TO service_role;

DROP POLICY IF EXISTS organizers_public_select ON public.organizers;
CREATE POLICY organizers_public_select ON public.organizers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS organizers_admin_write ON public.organizers;
CREATE POLICY organizers_admin_write ON public.organizers
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Junctions follow the parent event: public only when the event is public.
ALTER TABLE public.event_topics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_topics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.event_topics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.event_topics TO authenticated;
GRANT ALL ON TABLE public.event_topics TO service_role;

DROP POLICY IF EXISTS event_topics_select ON public.event_topics;
CREATE POLICY event_topics_select ON public.event_topics
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.events AS event
      WHERE event.id = event_id
        AND event.publication_status = 'published'
        AND event.verification_state IN ('source_confirmed', 'organizer_confirmed')
    )
  );

DROP POLICY IF EXISTS event_topics_admin_write ON public.event_topics;
CREATE POLICY event_topics_admin_write ON public.event_topics
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.event_offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_offers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.event_offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.event_offers TO authenticated;
GRANT ALL ON TABLE public.event_offers TO service_role;

DROP POLICY IF EXISTS event_offers_select ON public.event_offers;
CREATE POLICY event_offers_select ON public.event_offers
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.events AS event
      WHERE event.id = event_id
        AND event.publication_status = 'published'
        AND event.verification_state IN ('source_confirmed', 'organizer_confirmed')
    )
  );

DROP POLICY IF EXISTS event_offers_admin_write ON public.event_offers;
CREATE POLICY event_offers_admin_write ON public.event_offers
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.event_languages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_languages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.event_languages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.event_languages TO authenticated;
GRANT ALL ON TABLE public.event_languages TO service_role;

DROP POLICY IF EXISTS event_languages_select ON public.event_languages;
CREATE POLICY event_languages_select ON public.event_languages
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.events AS event
      WHERE event.id = event_id
        AND event.publication_status = 'published'
        AND event.verification_state IN ('source_confirmed', 'organizer_confirmed')
    )
  );

DROP POLICY IF EXISTS event_languages_admin_write ON public.event_languages;
CREATE POLICY event_languages_admin_write ON public.event_languages
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Profiles: a user reads and updates only their own row. Insert is the
-- auth trigger. Delete follows auth.users.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS profiles_own ON public.profiles;
CREATE POLICY profiles_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS profiles_own_update ON public.profiles;
CREATE POLICY profiles_own_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Roles: nobody grants themselves admin. A user may see their own row.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_roles_admin_write ON public.user_roles;
CREATE POLICY user_roles_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Organizer membership is admin-confirmed. Members can read their own row.
ALTER TABLE public.organizer_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.organizer_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.organizer_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.organizer_members TO authenticated;
GRANT ALL ON TABLE public.organizer_members TO service_role;

DROP POLICY IF EXISTS organizer_members_select ON public.organizer_members;
CREATE POLICY organizer_members_select ON public.organizer_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS organizer_members_admin_write ON public.organizer_members;
CREATE POLICY organizer_members_admin_write ON public.organizer_members
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Submissions: clients insert only. The insert trigger strips review fields.
-- Anonymous status checks go through get_submission_status(id, token).
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.submissions FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.submissions TO authenticated;
GRANT ALL ON TABLE public.submissions TO service_role;

DROP POLICY IF EXISTS submissions_insert ON public.submissions;
CREATE POLICY submissions_insert ON public.submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS submissions_select ON public.submissions;
CREATE POLICY submissions_select ON public.submissions
  FOR SELECT TO authenticated
  USING (submitter_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS submissions_admin_update ON public.submissions;
CREATE POLICY submissions_admin_update ON public.submissions
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS submissions_admin_delete ON public.submissions;
CREATE POLICY submissions_admin_delete ON public.submissions
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Reports and feedback: client insert only. No client read or edit.
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.reports FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.reports TO anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.reports TO authenticated;
GRANT ALL ON TABLE public.reports TO service_role;

DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert ON public.reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS reports_admin_select ON public.reports;
CREATE POLICY reports_admin_select ON public.reports
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS reports_admin_delete ON public.reports;
CREATE POLICY reports_admin_delete ON public.reports
  FOR DELETE TO authenticated
  USING (public.is_admin());

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feedback FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.feedback TO anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.feedback TO authenticated;
GRANT ALL ON TABLE public.feedback TO service_role;

DROP POLICY IF EXISTS feedback_insert ON public.feedback;
CREATE POLICY feedback_insert ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS feedback_admin_select ON public.feedback;
CREATE POLICY feedback_admin_select ON public.feedback
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS feedback_admin_delete ON public.feedback;
CREATE POLICY feedback_admin_delete ON public.feedback
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Plans belong to the authenticated user. Guests keep plans on device.
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.plans FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plans TO authenticated;
GRANT ALL ON TABLE public.plans TO service_role;

DROP POLICY IF EXISTS plans_own ON public.plans;
CREATE POLICY plans_own ON public.plans
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Friend plans: the owner manages the plan. Responses are not inserted
-- directly; respond_to_friend_plan checks the unguessable token.
ALTER TABLE public.friend_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.friend_plans FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.friend_plans TO authenticated;
GRANT ALL ON TABLE public.friend_plans TO service_role;

DROP POLICY IF EXISTS friend_plans_own ON public.friend_plans;
CREATE POLICY friend_plans_own ON public.friend_plans
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_user_id = auth.uid() OR public.is_admin());

ALTER TABLE public.friend_plan_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.friend_plan_responses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.friend_plan_responses TO authenticated;
GRANT ALL ON TABLE public.friend_plan_responses TO service_role;

DROP POLICY IF EXISTS friend_plan_responses_owner_select ON public.friend_plan_responses;
CREATE POLICY friend_plan_responses_owner_select ON public.friend_plan_responses
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.friend_plans AS plan
      WHERE plan.id = friend_plan_id
        AND plan.owner_user_id = auth.uid()
    )
  );

-- Translations of published events are public. Clients cannot write them.
ALTER TABLE public.event_translations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_translations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.event_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.event_translations TO authenticated;
GRANT ALL ON TABLE public.event_translations TO service_role;

DROP POLICY IF EXISTS event_translations_select ON public.event_translations;
CREATE POLICY event_translations_select ON public.event_translations
  FOR SELECT TO anon, authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.events AS event
      WHERE event.id = event_id
        AND event.publication_status = 'published'
        AND event.verification_state IN ('source_confirmed', 'organizer_confirmed')
    )
  );

DROP POLICY IF EXISTS event_translations_admin_write ON public.event_translations;
CREATE POLICY event_translations_admin_write ON public.event_translations
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Token lookup returns only status. A wrong token returns no row.
CREATE OR REPLACE FUNCTION public.get_submission_status(
  submission_id UUID,
  submission_token UUID
)
RETURNS TABLE (status TEXT, decision_reason TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT submission.status, submission.decision_reason
  FROM public.submissions AS submission
  WHERE submission.id = submission_id
    AND submission.access_token = submission_token;
$$;

REVOKE ALL ON FUNCTION public.get_submission_status(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_submission_status(UUID, UUID)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.respond_to_friend_plan(
  plan_token UUID,
  respondent_name TEXT,
  respondent_answer TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan public.friend_plans;
BEGIN
  SELECT * INTO plan FROM public.friend_plans WHERE token = plan_token;
  IF NOT FOUND
    OR plan.closed
    OR (plan.expires_at IS NOT NULL AND plan.expires_at < now())
  THEN
    RAISE EXCEPTION 'plan not available' USING ERRCODE = '22023';
  END IF;

  IF respondent_answer NOT IN ('in', 'maybe', 'cant')
    OR char_length(trim(respondent_name)) < 1
    OR char_length(trim(respondent_name)) > 40
  THEN
    RAISE EXCEPTION 'invalid response' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.friend_plan_responses (friend_plan_id, first_name, answer)
  VALUES (plan.id, trim(respondent_name), respondent_answer);
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_friend_plan(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_friend_plan(UUID, TEXT, TEXT)
  TO anon, authenticated, service_role;
