-- Free-text length limits and the report rate limit.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(14);

INSERT INTO public.organizers (id, name)
VALUES ('a0000000-0000-4000-8000-000000000021', 'pgtap limits organizer');

INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, organizer_id, source_url, source_type,
  publication_status, verification_state
) VALUES
  ('b0000000-0000-4000-8000-000000000021', 'pgtap limits A', 'fixture',
   'in_person', 'Test', now() + interval '1 day', 'Buea', 'CM',
   'pgtap limits organizer', 'a0000000-0000-4000-8000-000000000021',
   'https://example.com/pgtap-limits-a', 'organizer_site',
   'published', 'source_confirmed'),
  ('b0000000-0000-4000-8000-000000000022', 'pgtap limits B', 'fixture',
   'in_person', 'Test', now() + interval '1 day', 'Buea', 'CM',
   'pgtap limits organizer', 'a0000000-0000-4000-8000-000000000021',
   'https://example.com/pgtap-limits-b', 'organizer_site',
   'published', 'source_confirmed');

INSERT INTO auth.users (id, email)
VALUES ('c0000000-0000-4000-8000-000000000021', 'pgtap-reporter@meyalo.local');

-- Length limits. Checked as postgres, with no client claims, so the rate
-- limit does not apply and only the CHECK constraints are under test.
SELECT lives_ok(
  $$ INSERT INTO public.reports (event_id, reason, note, consent_version, consent_language, age_group)
     VALUES ('b0000000-0000-4000-8000-000000000021', 'other', repeat('x', 500), '2026-10-19', 'fr', '18_plus') $$,
  'a 500-character report note is accepted'
);
SELECT throws_ok(
  $$ INSERT INTO public.reports (event_id, reason, note, consent_version, consent_language, age_group)
     VALUES ('b0000000-0000-4000-8000-000000000021', 'other', repeat('x', 501), '2026-10-19', 'fr', '18_plus') $$,
  '23514', NULL, 'a 501-character report note is rejected'
);
SELECT throws_ok(
  $$ INSERT INTO public.feedback (category, message)
     VALUES ('bug', repeat('x', 2001)) $$,
  '23514', NULL, 'feedback longer than 2000 characters is rejected'
);
SELECT throws_ok(
  $$ INSERT INTO public.feedback (category, message, reply_email)
     VALUES ('bug', 'hello', repeat('a', 250) || '@x.cm') $$,
  '23514', NULL, 'a reply email longer than 254 characters is rejected'
);
SELECT throws_ok(
  $$ INSERT INTO public.submissions (source_url, note)
     VALUES ('https://example.com/pgtap-long-note', repeat('x', 1001)) $$,
  '23514', NULL, 'a submission note longer than 1000 characters is rejected'
);
SELECT throws_ok(
  $$ INSERT INTO public.submissions (raw_text)
     VALUES (repeat('x', 5001)) $$,
  '23514', NULL, 'submission raw text longer than 5000 characters is rejected'
);
SELECT lives_ok(
  $$ INSERT INTO public.submissions (source_url, note, raw_text)
     VALUES ('https://example.com/pgtap-max', repeat('x', 1000), repeat('x', 5000)) $$,
  'submission note and raw text at their limits are accepted'
);

-- Rate limit: a signed-in reporter gets 10 reports per rolling hour.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"c0000000-0000-4000-8000-000000000021","role":"authenticated"}';

SELECT lives_ok(
  $$ DO $do$ BEGIN
       FOR i IN 1..10 LOOP
         INSERT INTO public.reports (event_id, reason, consent_version, consent_language, age_group)
         VALUES ('b0000000-0000-4000-8000-000000000021', 'other', '2026-10-19', 'fr', '18_plus');
       END LOOP;
     END $do$ $$,
  'a signed-in user can file 10 reports in an hour'
);
SELECT throws_ok(
  $$ INSERT INTO public.reports (event_id, reason, consent_version, consent_language, age_group)
     VALUES ('b0000000-0000-4000-8000-000000000022', 'other', '2026-10-19', 'fr', '18_plus') $$,
  'PT429', NULL, 'the 11th report in an hour from the same user is rejected'
);

RESET ROLE;

-- Older reports do not count.
UPDATE public.reports SET created_at = now() - interval '61 minutes'
WHERE reporter_user_id = 'c0000000-0000-4000-8000-000000000021';

SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$ INSERT INTO public.reports (event_id, reason, consent_version, consent_language, age_group)
     VALUES ('b0000000-0000-4000-8000-000000000022', 'other', '2026-10-19', 'fr', '18_plus') $$,
  'reports older than an hour do not count towards the limit'
);
RESET ROLE;

-- Anonymous callers have no identity, so the cap is per event:
-- 20 anonymous reports per event per rolling hour.
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';

SELECT lives_ok(
  $$ DO $do$ BEGIN
       FOR i IN 1..20 LOOP
         INSERT INTO public.reports (event_id, reason, consent_version, consent_language, age_group)
         VALUES ('b0000000-0000-4000-8000-000000000022', 'other', '2026-10-19', 'fr', '18_plus');
       END LOOP;
     END $do$ $$,
  'anonymous callers can file 20 reports on one event in an hour'
);
SELECT throws_ok(
  $$ INSERT INTO public.reports (event_id, reason, consent_version, consent_language, age_group)
     VALUES ('b0000000-0000-4000-8000-000000000022', 'other', '2026-10-19', 'fr', '18_plus') $$,
  'PT429', NULL, 'the 21st anonymous report on one event in an hour is rejected'
);
SELECT lives_ok(
  $$ INSERT INTO public.reports (event_id, reason, consent_version, consent_language, age_group)
     VALUES ('b0000000-0000-4000-8000-000000000021', 'other', '2026-10-19', 'fr', '18_plus') $$,
  'the anonymous cap on one event does not block reports on another'
);

RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM public.reports
   WHERE event_id = 'b0000000-0000-4000-8000-000000000022'
     AND reporter_user_id IS NULL),
  20,
  'exactly 20 anonymous reports were stored for the capped event'
);

SELECT * FROM finish();
ROLLBACK;
