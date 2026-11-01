-- Consent (012): reports and suggestions carry the consent they were sent
-- with; none is stored without it, and under 18 needs a guardian.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(10);

INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, source_url, source_type, publication_status, verification_state
) VALUES (
  'e9000000-0000-4000-8000-000000000001', 'pgtap consent event', 'fixture',
  'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
  'pgtap consent org', 'https://example.com/consent', 'organizer_site',
  'published', 'source_confirmed'
);

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';

SELECT throws_ok(
  $$INSERT INTO public.reports (event_id, reason)
    VALUES ('e9000000-0000-4000-8000-000000000001', 'other')$$,
  '42501', NULL, 'a report without consent is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.reports
      (event_id, reason, consent_version, consent_language, age_group)
    VALUES ('e9000000-0000-4000-8000-000000000001', 'other',
            '2026-10-19', 'fr', 'under_18')$$,
  '23514', NULL, 'under 18 without a guardian is refused'
);
SELECT lives_ok(
  $$INSERT INTO public.reports
      (event_id, reason, consent_version, consent_language, age_group,
       consented_at)
    VALUES ('e9000000-0000-4000-8000-000000000001', 'wrong_place',
            '2026-10-19', 'en', '18_plus', '2000-01-01T00:00:00Z')$$,
  'a consented report is stored'
);
SELECT lives_ok(
  $$INSERT INTO public.reports
      (event_id, reason, consent_version, consent_language, age_group,
       guardian_consent)
    VALUES ('e9000000-0000-4000-8000-000000000001', 'broken_link',
            '2026-10-19', 'fr', 'under_18', true)$$,
  'under 18 with a guardian is stored'
);
RESET ROLE;

SELECT is(
  (SELECT count(*)::INT FROM public.reports
   WHERE event_id = 'e9000000-0000-4000-8000-000000000001'
     AND consented_at > now() - interval '1 minute'),
  2, 'the server sets the consent time; a client cannot backdate it'
);

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
SELECT throws_ok(
  $$SELECT * FROM public.submit_event(
      'https://example.com/pgtap-consent', NULL, NULL,
      NULL, NULL, NULL, NULL)$$,
  '22023', NULL, 'a suggestion without consent is refused'
);
SELECT throws_ok(
  $$SELECT * FROM public.submit_event(
      'https://example.com/pgtap-consent', NULL, NULL,
      '2026-10-19', 'fr', 'under_18', false)$$,
  '22023', NULL, 'an under-18 suggestion without a guardian is refused'
);
SELECT lives_ok(
  $$SELECT * FROM public.submit_event(
      'https://example.com/pgtap-consent', NULL, NULL,
      '2026-10-19', 'en', '18_plus', false)$$,
  'a consented suggestion is stored'
);
SELECT throws_ok(
  $$SELECT * FROM public.submit_event('https://example.com/old', NULL, NULL)$$,
  '42883', NULL, 'the old call without consent no longer exists'
);
RESET ROLE;

SELECT is(
  (SELECT consent_language FROM public.submissions
   WHERE source_url = 'https://example.com/pgtap-consent'),
  'en', 'the suggestion keeps its consent record'
);

SELECT * FROM finish();
ROLLBACK;
