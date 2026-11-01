-- Event supply (009): public submissions, their status, the rate cap,
-- the sport topic and the curator coverage view.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(13);

INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-000000000061', 'pgtap-supply-curator@meyalo.local'),
  ('c0000000-0000-4000-8000-000000000062', 'pgtap-supply-member@meyalo.local');
INSERT INTO public.user_roles (user_id, role) VALUES
  ('c0000000-0000-4000-8000-000000000061', 'admin');

-- 1. Anyone can submit and track a submission with its token.
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';

CREATE TEMP TABLE submitted ON COMMIT DROP AS
  SELECT * FROM public.submit_event(
    'https://example.com/pgtap-supply', NULL, 'Saw this on a church notice board',
    '2026-10-19', 'fr', '18_plus', false
  );
GRANT SELECT ON submitted TO anon;

SELECT is((SELECT count(*) FROM submitted)::INT, 1, 'submit_event returns the submission');
SELECT isnt((SELECT access_token FROM submitted), NULL, 'and a status token');
SELECT is(
  (SELECT status FROM public.get_submission_status(
     (SELECT id FROM submitted), (SELECT access_token FROM submitted))),
  'under_review', 'the token shows the status'
);
SELECT is_empty(
  $$ SELECT * FROM public.get_submission_status(
       (SELECT id FROM submitted), gen_random_uuid()) $$,
  'a wrong token shows nothing'
);
SELECT throws_ok(
  $$ SELECT * FROM public.submit_event(NULL, NULL, 'only a note', '2026-10-19', 'fr', '18_plus', false) $$,
  '23514', NULL, 'a submission needs a link or a description'
);
SELECT throws_ok(
  $$ SELECT * FROM public.submit_event('http://example.com/x', NULL, NULL, '2026-10-19', 'fr', '18_plus', false) $$,
  '23514', NULL, 'links must be https'
);
SELECT lives_ok(
  $$ SELECT * FROM public.submit_event(NULL, 'Agri fair, Bafoussam, 12 Dec', NULL, '2026-10-19', 'fr', '18_plus', false) $$,
  'a description alone is enough'
);
RESET ROLE;

-- 2. Anonymous submissions are capped per hour (abuse floor; see 009).
-- Fill up to the cap as a server job (no client JWT), counting what is
-- already there so the test does not depend on other recent rows.
SET LOCAL request.jwt.claims TO '{}';
SELECT lives_ok(
  $$ INSERT INTO public.submissions (raw_text)
     SELECT 'filler ' || n
     FROM generate_series(
       1,
       GREATEST(0, 60 - (SELECT count(*) FROM public.submissions
                         WHERE submitter_user_id IS NULL
                           AND created_at > now() - interval '1 hour'))
     ) AS n $$,
  'fill the hour up to the cap (server jobs are not limited)'
);
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
SELECT throws_ok(
  $$ SELECT * FROM public.submit_event(NULL, 'one too many', NULL, '2026-10-19', 'fr', '18_plus', false) $$,
  'PT429', NULL, 'the hourly cap stops a flood'
);
RESET ROLE;

-- 3. Sport is a topic.
SELECT ok(
  EXISTS (SELECT 1 FROM public.topics WHERE id = 'sport_wellbeing'),
  'sport_wellbeing is in the taxonomy'
);

-- 4. Coverage is for curators only and counts upcoming published events.
INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, source_url, source_type, publication_status,
  verification_state
) VALUES
  ('b0000000-0000-4000-8000-000000000061', 'pgtap coverage live', 'fixture',
   'in_person', 'Test', now() + interval '5 days', 'Pgtapville', 'CM',
   'pgtap', 'https://example.com/cov-1', 'organizer_site', 'published',
   'source_confirmed'),
  ('b0000000-0000-4000-8000-000000000062', 'pgtap coverage draft', 'fixture',
   'in_person', 'Test', now() + interval '5 days', 'Pgtapville', 'CM',
   'pgtap', 'https://example.com/cov-2', 'organizer_site', 'draft',
   'unreviewed');
INSERT INTO public.event_topics (event_id, topic_id) VALUES
  ('b0000000-0000-4000-8000-000000000061', 'agriculture'),
  ('b0000000-0000-4000-8000-000000000062', 'agriculture');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"role":"authenticated","sub":"c0000000-0000-4000-8000-000000000062"}';
SELECT throws_ok(
  $$ SELECT * FROM public.curation_coverage() $$,
  '42501', NULL, 'a non-curator cannot read coverage'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"role":"authenticated","sub":"c0000000-0000-4000-8000-000000000061"}';
SELECT is(
  (SELECT upcoming FROM public.curation_coverage()
   WHERE city = 'Pgtapville' AND topic_id = 'agriculture'),
  1, 'coverage counts upcoming published events only'
);
SELECT is_empty(
  $$ SELECT 1 FROM public.curation_coverage()
     WHERE city = 'Pgtapville' AND topic_id = 'technology' $$,
  'topics with no events are absent (the console shows them as gaps)'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
