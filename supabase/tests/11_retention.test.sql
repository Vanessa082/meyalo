-- Retention (014): what is removed and when (docs/product-decisions.md,
-- "Spec: accounts", retention table). Old rows are backdated with triggers
-- off; the transaction rolls back.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(9);

INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, source_url, source_type, publication_status, verification_state
) VALUES (
  'e2000000-0000-4000-8000-000000000001', 'pgtap retention event', 'fixture',
  'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
  'pgtap retention org', 'https://example.com/ret', 'organizer_site',
  'published', 'source_confirmed'
);

SET LOCAL session_replication_role = replica;

INSERT INTO public.account_deletions (user_hash, deleted_at, source) VALUES
  (repeat('a', 64), now() - interval '3 years 1 day', 'app'),
  (repeat('b', 64), now() - interval '2 years', 'app');

INSERT INTO public.reports (event_id, reason, note, created_at) VALUES
  ('e2000000-0000-4000-8000-000000000001', 'other', 'pgtap old report', now() - interval '13 months'),
  ('e2000000-0000-4000-8000-000000000001', 'other', 'pgtap new report', now() - interval '11 months');

INSERT INTO public.submissions (id, raw_text, note, status, created_at, updated_at) VALUES
  ('f2000000-0000-4000-8000-000000000001', 'pgtap old decided', 'mine', 'not_added',
   now() - interval '14 months', now() - interval '13 months'),
  ('f2000000-0000-4000-8000-000000000002', 'pgtap old open', 'mine', 'under_review',
   now() - interval '14 months', now() - interval '14 months'),
  ('f2000000-0000-4000-8000-000000000003', 'pgtap old published', 'my phone 6xx', 'published',
   now() - interval '14 months', now() - interval '13 months');
UPDATE public.events SET source_submission_id = 'f2000000-0000-4000-8000-000000000003'
WHERE id = 'e2000000-0000-4000-8000-000000000001';

SET LOCAL session_replication_role = origin;

SELECT lives_ok($$ SELECT public.apply_retention() $$, 'retention runs');

SELECT is((SELECT count(*)::INT FROM public.account_deletions WHERE user_hash = repeat('a', 64)),
  0, 'deletion records go after 3 years');
SELECT is((SELECT count(*)::INT FROM public.account_deletions WHERE user_hash = repeat('b', 64)),
  1, 'younger deletion records stay');
SELECT is((SELECT count(*)::INT FROM public.reports WHERE note = 'pgtap old report'),
  0, 'reports go 12 months after they were sent');
SELECT is((SELECT count(*)::INT FROM public.reports WHERE note = 'pgtap new report'),
  1, 'younger reports stay');
SELECT is((SELECT count(*)::INT FROM public.submissions WHERE id = 'f2000000-0000-4000-8000-000000000001'),
  0, 'suggestions go 12 months after the decision');
SELECT is((SELECT count(*)::INT FROM public.submissions WHERE id = 'f2000000-0000-4000-8000-000000000002'),
  1, 'a suggestion still under review stays');
SELECT is(
  (SELECT row(note IS NULL, raw_text)::TEXT FROM public.submissions
   WHERE id = 'f2000000-0000-4000-8000-000000000003'),
  '(t,"pgtap old published")',
  'a published suggestion keeps the event text but loses the personal note');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"role":"authenticated"}';
SELECT throws_ok($$ SELECT public.apply_retention() $$, '42501', NULL,
  'clients cannot run retention');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
