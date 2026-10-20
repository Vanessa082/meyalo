-- Accounts (013): synced plans and profile, own rows only, latest change
-- wins per field, nothing stored before consent, deletion records closed.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(22);

INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, source_url, source_type, publication_status, verification_state
) VALUES
  ('e1000000-0000-4000-8000-000000000001', 'pgtap account event one', 'fixture',
   'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
   'pgtap account org', 'https://example.com/acc-1', 'organizer_site',
   'published', 'source_confirmed'),
  ('e1000000-0000-4000-8000-000000000002', 'pgtap account event two', 'fixture',
   'in_person', 'Test', now() + interval '4 days', 'Buea', 'CM',
   'pgtap account org', 'https://example.com/acc-2', 'organizer_site',
   'published', 'source_confirmed');

INSERT INTO auth.users (id, email) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'pgtap-a@meyalo.local'),
  ('a1000000-0000-4000-8000-00000000000b', 'pgtap-b@meyalo.local'),
  ('a1000000-0000-4000-8000-00000000000c', 'pgtap-curator@meyalo.local');
INSERT INTO public.user_roles (user_id, role)
VALUES ('a1000000-0000-4000-8000-00000000000c', 'admin');
-- B already has a plan, written as the server would.
INSERT INTO public.plans (user_id, event_id, state, state_changed_at)
VALUES ('a1000000-0000-4000-8000-00000000000b',
        'e1000000-0000-4000-8000-000000000001', 'going', now());

SELECT is(
  (SELECT count(*)::INT FROM public.profiles
   WHERE id = 'a1000000-0000-4000-8000-00000000000a'),
  1, 'a new user gets a profile row');

-- Anonymous visitors cannot sync at all.
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
SELECT throws_ok(
  $$ SELECT public.sync_account('[]'::jsonb, NULL) $$,
  '42501', NULL, 'anon cannot sync');
RESET ROLE;

-- User A.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"a1000000-0000-4000-8000-00000000000a","role":"authenticated"}';

SELECT throws_ok(
  $$ SELECT public.sync_account('[]'::jsonb, NULL) $$,
  '42501', NULL, 'nothing is synced before consent');
SELECT throws_ok(
  $$ INSERT INTO public.account_consents
       (consent_version, consent_language, age_group)
     VALUES ('2026-10-20', 'fr', 'under_18') $$,
  '23514', NULL, 'under 18 needs the guardian');
SELECT throws_ok(
  $$ INSERT INTO public.account_consents
       (user_id, consent_version, consent_language, age_group)
     VALUES ('a1000000-0000-4000-8000-00000000000b', '2026-10-20', 'fr', '18_plus') $$,
  '42501', NULL, 'no consent can be written for someone else');
SELECT lives_ok(
  $$ INSERT INTO public.account_consents
       (consent_version, consent_language, age_group)
     VALUES ('2026-10-20', 'fr', '18_plus') $$,
  'a complete consent is recorded');

CREATE TEMP TABLE t AS SELECT now() AS base;
GRANT SELECT ON t TO authenticated;

-- Saved at base.
SELECT is(
  jsonb_array_length(public.sync_account(jsonb_build_array(jsonb_build_object(
    'event_id', 'e1000000-0000-4000-8000-000000000001',
    'state', 'saved', 'state_changed_at', (SELECT base FROM t),
    'snapshot', '{"title":"one"}'::jsonb
  )), NULL) -> 'plans'),
  1, 'sync returns the account plans');

-- An older Going does not replace the newer Saved.
SELECT public.sync_account(jsonb_build_array(jsonb_build_object(
  'event_id', 'e1000000-0000-4000-8000-000000000001',
  'state', 'going', 'state_changed_at', (SELECT base - interval '1 hour' FROM t)
)), NULL);
SELECT is((SELECT state FROM public.plans
           WHERE event_id = 'e1000000-0000-4000-8000-000000000001'),
  'saved', 'an older change loses');

-- A newer Going wins.
SELECT public.sync_account(jsonb_build_array(jsonb_build_object(
  'event_id', 'e1000000-0000-4000-8000-000000000001',
  'state', 'going', 'state_changed_at', (SELECT base + interval '2 minutes' FROM t)
)), NULL);
SELECT is((SELECT state FROM public.plans
           WHERE event_id = 'e1000000-0000-4000-8000-000000000001'),
  'going', 'a newer change wins');

-- A removal older than the last change is ignored; a newer one removes.
SELECT public.sync_account(jsonb_build_array(jsonb_build_object(
  'event_id', 'e1000000-0000-4000-8000-000000000001',
  'state', NULL, 'state_changed_at', (SELECT base + interval '1 minute' FROM t)
)), NULL);
SELECT is((SELECT removed_at FROM public.plans
           WHERE event_id = 'e1000000-0000-4000-8000-000000000001'),
  NULL, 'an older removal is ignored');
SELECT public.sync_account(jsonb_build_array(jsonb_build_object(
  'event_id', 'e1000000-0000-4000-8000-000000000001',
  'state', NULL, 'state_changed_at', (SELECT base + interval '3 minutes' FROM t)
)), NULL);
SELECT isnt((SELECT removed_at FROM public.plans
             WHERE event_id = 'e1000000-0000-4000-8000-000000000001'),
  NULL, 'a newer removal removes');

-- Saving again after the removal brings it back.
SELECT public.sync_account(jsonb_build_array(jsonb_build_object(
  'event_id', 'e1000000-0000-4000-8000-000000000001',
  'state', 'saved', 'state_changed_at', (SELECT base + interval '4 minutes' FROM t),
  'registered', true, 'registered_changed_at', (SELECT base + interval '4 minutes' FROM t),
  'attended', true, 'attended_changed_at', (SELECT base + interval '4 minutes' FROM t)
)), NULL);
SELECT is(
  (SELECT row(state, removed_at IS NULL, registered, attended)::TEXT
   FROM public.plans WHERE event_id = 'e1000000-0000-4000-8000-000000000001'),
  '(saved,t,t,t)', 'a later save restores it with each field');

-- Each field keeps its own latest change.
SELECT public.sync_account(jsonb_build_array(jsonb_build_object(
  'event_id', 'e1000000-0000-4000-8000-000000000001',
  'state', 'going', 'state_changed_at', (SELECT base FROM t),
  'registered', false, 'registered_changed_at', (SELECT base + interval '5 minutes' FROM t)
)), NULL);
SELECT is(
  (SELECT row(state, registered)::TEXT FROM public.plans
   WHERE event_id = 'e1000000-0000-4000-8000-000000000001'),
  '(saved,f)', 'the plan state and registered merge separately');

SELECT throws_ok(
  $$ SELECT public.sync_account(jsonb_build_array(jsonb_build_object(
       'event_id', 'e1000000-0000-4000-8000-000000000002',
       'state', 'saved', 'state_changed_at', now() + interval '2 days'
     )), NULL) $$,
  '22023', NULL, 'a change time far in the future is refused');

SELECT public.sync_account(jsonb_build_array(jsonb_build_object(
  'event_id', 'e1000000-0000-4000-8000-0000000000ff',
  'state', 'saved', 'state_changed_at', now()
)), NULL);
SELECT is((SELECT count(*)::INT FROM public.plans
           WHERE event_id = 'e1000000-0000-4000-8000-0000000000ff'),
  0, 'an unknown event is skipped');

-- Profile: the most recent edit wins.
SELECT public.sync_account('[]'::jsonb, jsonb_build_object(
  'discovery', '{"interestIds":["technology"]}'::jsonb,
  'updated_at', (SELECT base FROM t)));
SELECT public.sync_account('[]'::jsonb, jsonb_build_object(
  'discovery', '{"interestIds":["health"]}'::jsonb,
  'updated_at', (SELECT base - interval '1 day' FROM t)));
SELECT is(
  (SELECT discovery -> 'interestIds' ->> 0 FROM public.profiles
   WHERE id = 'a1000000-0000-4000-8000-00000000000a'),
  'technology', 'an older profile does not replace a newer one');

SELECT is((SELECT count(*)::INT FROM public.plans), 1,
  'a user sees only their own plans');
SELECT throws_ok(
  $$ SELECT count(*) FROM public.account_deletions $$,
  '42501', NULL, 'users cannot read deletion records');
RESET ROLE;

-- User B sees nothing of A.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"a1000000-0000-4000-8000-00000000000b","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::INT FROM public.plans
   WHERE user_id = 'a1000000-0000-4000-8000-00000000000a'),
  0, 'another user cannot read the plans');
SELECT is(
  (SELECT count(*)::INT FROM public.account_consents
   WHERE user_id = 'a1000000-0000-4000-8000-00000000000a'),
  0, 'or the consents');
RESET ROLE;

-- Curators review events, not people's plans.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"a1000000-0000-4000-8000-00000000000c","role":"authenticated"}';
SELECT is(
  (SELECT count(*)::INT FROM public.plans
   WHERE user_id <> 'a1000000-0000-4000-8000-00000000000c'),
  0, 'a curator cannot read other people''s plans');
SELECT is(
  (SELECT count(*)::INT FROM public.profiles
   WHERE id <> 'a1000000-0000-4000-8000-00000000000c'),
  0, 'or their profiles');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
