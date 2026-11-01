-- What anonymous and signed-in clients can read.
-- Fixtures are created as postgres (table owner, bypasses RLS) and rolled back.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(12);

INSERT INTO public.organizers (id, name) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pgtap public organizer'),
  ('a0000000-0000-4000-8000-000000000002', 'pgtap draft-only organizer');

INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, organizer_id, source_url, source_type,
  publication_status, verification_state
) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'pgtap published', 'fixture',
   'in_person', 'Test', now() + interval '1 day', 'Buea', 'CM',
   'pgtap public organizer', 'a0000000-0000-4000-8000-000000000001',
   'https://example.com/pgtap-published', 'organizer_site',
   'published', 'source_confirmed'),
  ('b0000000-0000-4000-8000-000000000002', 'pgtap draft', 'fixture',
   'in_person', 'Test', now() + interval '1 day', 'Buea', 'CM',
   'pgtap draft-only organizer', 'a0000000-0000-4000-8000-000000000002',
   'https://example.com/pgtap-draft', 'organizer_site',
   'draft', 'unreviewed');

-- The public view exists and leaves out curator and provenance columns.
SELECT has_view('public', 'events_public', 'events_public view exists');
SELECT has_column('public', 'events_public', 'title', 'events_public exposes title');
SELECT hasnt_column('public', 'events_public', 'checked_by',
  'events_public does not expose checked_by (a curator user id)');
SELECT hasnt_column('public', 'events_public', 'source_submission_id',
  'events_public does not expose source_submission_id');

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';

SELECT is_empty(
  $$ SELECT id FROM public.events WHERE id = 'b0000000-0000-4000-8000-000000000002' $$,
  'anon cannot read a draft event from the table'
);
SELECT throws_ok(
  $$ SELECT id FROM public.reports $$,
  '42501', NULL, 'anon cannot read reports'
);
SELECT throws_ok(
  $$ SELECT id FROM public.feedback $$,
  '42501', NULL, 'anon cannot read feedback'
);
SELECT throws_ok(
  $$ SELECT id FROM public.submissions $$,
  '42501', NULL, 'anon cannot read submissions'
);
SELECT results_eq(
  $$ SELECT id FROM public.organizers
     WHERE id IN ('a0000000-0000-4000-8000-000000000001',
                  'a0000000-0000-4000-8000-000000000002') $$,
  $$ VALUES ('a0000000-0000-4000-8000-000000000001'::uuid) $$,
  'anon reads only organizers that have a public event'
);

SELECT results_eq(
  $$ SELECT id FROM public.events_public
     WHERE id IN ('b0000000-0000-4000-8000-000000000001',
                  'b0000000-0000-4000-8000-000000000002') $$,
  $$ VALUES ('b0000000-0000-4000-8000-000000000001'::uuid) $$,
  'anon reads the published event through events_public, not the draft'
);
RESET ROLE;

-- A signed-in user without the curator role sees the same as anon.
INSERT INTO auth.users (id, email)
VALUES ('c0000000-0000-4000-8000-000000000001', 'pgtap-member@meyalo.local');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}';

SELECT is_empty(
  $$ SELECT id FROM public.events WHERE id = 'b0000000-0000-4000-8000-000000000002' $$,
  'a non-curator cannot read a draft event'
);
SELECT is_empty(
  $$ SELECT id FROM public.organizers WHERE id = 'a0000000-0000-4000-8000-000000000002' $$,
  'a non-curator cannot read an organizer with no public event'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
