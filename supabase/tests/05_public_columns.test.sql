-- Curator and provenance columns (008): anon reads events through
-- events_public and cannot read checked_by or source_submission_id.
-- Fixtures are created as postgres (table owner, bypasses RLS) and rolled back.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(9);

INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-000000000051', 'pgtap-curator@meyalo.local');
INSERT INTO public.user_roles (user_id, role) VALUES
  ('c0000000-0000-4000-8000-000000000051', 'admin');

INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, source_url, source_type,
  publication_status, verification_state, checked_by, last_checked_at
) VALUES
  ('b0000000-0000-4000-8000-000000000051', 'pgtap public columns', 'fixture',
   'in_person', 'Test', now() + interval '1 day', 'Buea', 'CM',
   'pgtap organizer', 'https://example.com/pgtap-public-columns',
   'organizer_site', 'published', 'source_confirmed',
   'c0000000-0000-4000-8000-000000000051', now());

INSERT INTO public.event_topics (event_id, topic_id)
SELECT 'b0000000-0000-4000-8000-000000000051', id FROM public.topics LIMIT 1;

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';

SELECT throws_ok(
  $$ SELECT checked_by FROM public.events $$,
  '42501', NULL, 'anon cannot read events.checked_by'
);
SELECT throws_ok(
  $$ SELECT source_submission_id FROM public.events $$,
  '42501', NULL, 'anon cannot read events.source_submission_id'
);
SELECT throws_ok(
  $$ SELECT * FROM public.events $$,
  '42501', NULL, 'anon cannot select every column of events'
);
SELECT results_eq(
  $$ SELECT id FROM public.events_public
     WHERE id = 'b0000000-0000-4000-8000-000000000051' $$,
  $$ VALUES ('b0000000-0000-4000-8000-000000000051'::uuid) $$,
  'anon reads the published event through events_public'
);
SELECT lives_ok(
  $$ SELECT * FROM public.events_public $$,
  'anon can select every column of events_public'
);
SELECT isnt_empty(
  $$ SELECT 1 FROM public.event_topics
     WHERE event_id = 'b0000000-0000-4000-8000-000000000051' $$,
  'anon still reads the topics of a published event'
);
RESET ROLE;

-- Curators keep full access to the table.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"c0000000-0000-4000-8000-000000000051","role":"authenticated"}';

SELECT results_eq(
  $$ SELECT checked_by FROM public.events
     WHERE id = 'b0000000-0000-4000-8000-000000000051' $$,
  $$ VALUES ('c0000000-0000-4000-8000-000000000051'::uuid) $$,
  'a curator reads checked_by'
);
SELECT lives_ok(
  $$ SELECT source_submission_id FROM public.events $$,
  'a curator reads source_submission_id'
);
RESET ROLE;

-- The view still has no curator or provenance columns.
SELECT hasnt_column('public', 'events_public', 'checked_by',
  'events_public does not expose checked_by');

SELECT * FROM finish();
ROLLBACK;
