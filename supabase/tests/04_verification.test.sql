-- Verification model (007): evidence trail, record_check rules, scam auto-hide.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(22);

-- Fixtures: two curators, one non-curator, one partner and one plain organizer.
INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-000000000041', 'pgtap-curator-a@meyalo.local'),
  ('c0000000-0000-4000-8000-000000000042', 'pgtap-curator-b@meyalo.local'),
  ('c0000000-0000-4000-8000-000000000043', 'pgtap-member@meyalo.local');
INSERT INTO public.user_roles (user_id, role) VALUES
  ('c0000000-0000-4000-8000-000000000041', 'admin'),
  ('c0000000-0000-4000-8000-000000000042', 'admin');

INSERT INTO public.organizers (id, name, is_partner) VALUES
  ('a0000000-0000-4000-8000-000000000041', 'pgtap plain organizer', false),
  ('a0000000-0000-4000-8000-000000000042', 'pgtap partner organizer', true);

INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, organizer_id, source_url, source_type,
  publication_status, verification_state
) VALUES
  -- 41: draft to confirm. 42: fee-charging draft. 43: published, rejected later.
  ('b0000000-0000-4000-8000-000000000041', 'pgtap confirm', 'fixture',
   'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
   'pgtap plain organizer', 'a0000000-0000-4000-8000-000000000041',
   'https://example.com/pgtap-41', 'organizer_site', 'draft', 'unreviewed'),
  ('b0000000-0000-4000-8000-000000000042', 'pgtap fee', 'fixture',
   'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
   'pgtap plain organizer', 'a0000000-0000-4000-8000-000000000041',
   'https://example.com/pgtap-42', 'organizer_site', 'draft', 'unreviewed'),
  ('b0000000-0000-4000-8000-000000000043', 'pgtap reject', 'fixture',
   'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
   'pgtap plain organizer', 'a0000000-0000-4000-8000-000000000041',
   'https://example.com/pgtap-43', 'organizer_site', 'published', 'source_confirmed'),
  -- 44: published, plain organizer (scam reports hide it).
  -- 45: published, organizer confirmed (not hidden). 46: partner (not hidden).
  ('b0000000-0000-4000-8000-000000000044', 'pgtap scam target', 'fixture',
   'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
   'pgtap plain organizer', 'a0000000-0000-4000-8000-000000000041',
   'https://example.com/pgtap-44', 'organizer_site', 'published', 'source_confirmed'),
  ('b0000000-0000-4000-8000-000000000045', 'pgtap organizer confirmed', 'fixture',
   'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
   'pgtap plain organizer', 'a0000000-0000-4000-8000-000000000041',
   'https://example.com/pgtap-45', 'organizer_site', 'published', 'organizer_confirmed'),
  ('b0000000-0000-4000-8000-000000000046', 'pgtap partner event', 'fixture',
   'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
   'pgtap partner organizer', 'a0000000-0000-4000-8000-000000000042',
   'https://example.com/pgtap-46', 'organizer_site', 'published', 'source_confirmed');

-- 1. The evidence trail is curator-only.
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
SELECT throws_ok(
  $$ SELECT * FROM public.event_checks $$,
  '42501', NULL, 'anon cannot read the evidence trail'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"role":"authenticated","sub":"c0000000-0000-4000-8000-000000000043"}';
SELECT is_empty(
  $$ SELECT 1 FROM public.event_checks $$,
  'a non-curator sees no checks'
);
SELECT throws_ok(
  $$ SELECT public.record_check('b0000000-0000-4000-8000-000000000041',
       'source_confirmed', 'official_site', 'https://example.com/a',
       '{}', false, NULL) $$,
  '42501', NULL, 'a non-curator cannot record a check'
);
RESET ROLE;

-- 2. Curator A: rules inside record_check.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"role":"authenticated","sub":"c0000000-0000-4000-8000-000000000041"}';

SELECT throws_ok(
  $$ UPDATE public.events SET verification_state = 'source_confirmed'
     WHERE id = 'b0000000-0000-4000-8000-000000000041' $$,
  '42501', NULL, 'verification cannot change outside record_check'
);
SELECT throws_ok(
  $$ SELECT public.record_check('b0000000-0000-4000-8000-000000000041',
       'source_confirmed', 'official_site', 'https://example.com/a',
       ARRAY['guaranteed_award'], false, NULL) $$,
  '23514', NULL, 'a check with a red flag cannot confirm'
);
SELECT throws_ok(
  $$ SELECT public.record_check('b0000000-0000-4000-8000-000000000041',
       'organizer_confirmed', 'official_site', 'https://example.com/a',
       '{}', false, NULL) $$,
  '23514', NULL, 'organizer confirmation needs contact with the organizer'
);
SELECT throws_ok(
  $$ SELECT public.record_check('b0000000-0000-4000-8000-000000000041',
       'source_confirmed', 'official_site', 'http://example.com/a',
       '{}', false, NULL) $$,
  '23514', NULL, 'evidence must be an https link'
);
SELECT is(
  public.record_check('b0000000-0000-4000-8000-000000000041',
    'source_confirmed', 'official_site', 'https://example.com/a',
    '{}', false, 'Matches the organizer site'),
  'confirmed', 'a clean check confirms'
);
SELECT is(
  (SELECT verification_state::text FROM public.events
   WHERE id = 'b0000000-0000-4000-8000-000000000041'),
  'source_confirmed', 'the event is confirmed'
);
SELECT is(
  (SELECT checked_by FROM public.event_checks
   WHERE event_id = 'b0000000-0000-4000-8000-000000000041'),
  'c0000000-0000-4000-8000-000000000041'::uuid,
  'the check records who made it'
);

-- Fee: one curator is not enough.
SELECT is(
  public.record_check('b0000000-0000-4000-8000-000000000042',
    'source_confirmed', 'official_site', 'https://example.com/fee',
    '{}', true, 'Charges a 10 000 FCFA application fee'),
  'needs_second_review', 'a fee-charging event needs a second curator'
);
SELECT is(
  (SELECT verification_state::text FROM public.events
   WHERE id = 'b0000000-0000-4000-8000-000000000042'),
  'unreviewed', 'one curator cannot confirm a fee-charging event'
);

-- Rejecting a published event takes it back to review.
SELECT is(
  public.record_check('b0000000-0000-4000-8000-000000000043',
    'unreviewed', 'official_site', 'https://example.com/gone',
    ARRAY['lookalike_domain'], false, 'Source domain imitates a funder'),
  'rejected', 'a rejection is recorded'
);
SELECT results_eq(
  $$ SELECT publication_status::text, verification_state::text
     FROM public.events WHERE id = 'b0000000-0000-4000-8000-000000000043' $$,
  $$ VALUES ('under_review', 'unreviewed') $$,
  'a rejected published event goes back to review'
);
RESET ROLE;

-- Curator B confirms the fee-charging event: two curators, now confirmed.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"role":"authenticated","sub":"c0000000-0000-4000-8000-000000000042"}';
SELECT is(
  public.record_check('b0000000-0000-4000-8000-000000000042',
    'source_confirmed', 'official_site', 'https://example.com/fee',
    '{}', true, 'Fee confirmed on the official site'),
  'confirmed', 'a second curator confirms a fee-charging event'
);
-- A re-check of an already confirmed event refreshes who checked.
SELECT is(
  public.record_check('b0000000-0000-4000-8000-000000000041',
    'source_confirmed', 'official_site', 'https://example.com/a',
    '{}', false, 'Re-checked'),
  'confirmed', 'a re-check of a confirmed event is recorded'
);
SELECT is(
  (SELECT checked_by FROM public.events
   WHERE id = 'b0000000-0000-4000-8000-000000000041'),
  'c0000000-0000-4000-8000-000000000042'::uuid,
  'a re-check updates who last checked'
);
SELECT throws_ok(
  $$ UPDATE public.events SET checked_by = 'c0000000-0000-4000-8000-000000000042'
     WHERE id = 'b0000000-0000-4000-8000-000000000044' $$,
  '42501', NULL, 'the check date cannot be refreshed without a check'
);
RESET ROLE;

-- 3. Scam reports.
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
INSERT INTO public.reports (event_id, reason, consent_version, consent_language, age_group) VALUES
  ('b0000000-0000-4000-8000-000000000044', 'scam', '2026-10-19', 'fr', '18_plus');
RESET ROLE;
SELECT is(
  (SELECT publication_status::text FROM public.events
   WHERE id = 'b0000000-0000-4000-8000-000000000044'),
  'published', 'one scam report does not hide an event'
);

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
INSERT INTO public.reports (event_id, reason, consent_version, consent_language, age_group) VALUES
  ('b0000000-0000-4000-8000-000000000044', 'scam', '2026-10-19', 'fr', '18_plus'),
  ('b0000000-0000-4000-8000-000000000045', 'scam', '2026-10-19', 'fr', '18_plus'),
  ('b0000000-0000-4000-8000-000000000045', 'scam', '2026-10-19', 'fr', '18_plus'),
  ('b0000000-0000-4000-8000-000000000046', 'scam', '2026-10-19', 'fr', '18_plus'),
  ('b0000000-0000-4000-8000-000000000046', 'scam', '2026-10-19', 'fr', '18_plus');
RESET ROLE;
SELECT is(
  (SELECT publication_status::text FROM public.events
   WHERE id = 'b0000000-0000-4000-8000-000000000044'),
  'under_review', 'two scam reports send the event back to review'
);
SELECT is(
  (SELECT publication_status::text FROM public.events
   WHERE id = 'b0000000-0000-4000-8000-000000000045'),
  'published', 'organizer-confirmed events are not hidden by reports'
);
SELECT is(
  (SELECT publication_status::text FROM public.events
   WHERE id = 'b0000000-0000-4000-8000-000000000046'),
  'published', 'partner organizers'' events are not hidden by reports'
);

SELECT * FROM finish();
ROLLBACK;
