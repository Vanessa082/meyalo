-- Plans with friends (015): signed-in owners with consent, friends answer
-- with a first name through the link token, counts only unless the owner
-- shows names, each answer keeps the setting it was given under.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(27);

INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, source_url, source_type, publication_status, verification_state
) VALUES
  ('e3000000-0000-4000-8000-000000000001', 'pgtap friends event', 'fixture',
   'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
   'pgtap friends org', 'https://example.com/fr-1', 'organizer_site',
   'published', 'source_confirmed'),
  ('e3000000-0000-4000-8000-000000000002', 'pgtap ended event', 'fixture',
   'in_person', 'Test', now() - interval '3 days', 'Buea', 'CM',
   'pgtap friends org', 'https://example.com/fr-2', 'organizer_site',
   'published', 'source_confirmed');

INSERT INTO auth.users (id, email) VALUES
  ('a3000000-0000-4000-8000-00000000000a', 'pgtap-owner@meyalo.local'),
  ('a3000000-0000-4000-8000-00000000000b', 'pgtap-other@meyalo.local'),
  ('a3000000-0000-4000-8000-00000000000c', 'pgtap-fcurator@meyalo.local');
INSERT INTO public.user_roles (user_id, role)
VALUES ('a3000000-0000-4000-8000-00000000000c', 'admin');

CREATE TEMP TABLE ctx (plan_token UUID, first_answer UUID, second_answer UUID);
INSERT INTO ctx DEFAULT VALUES;
GRANT ALL ON ctx TO anon, authenticated;

-- The owner.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"a3000000-0000-4000-8000-00000000000a","role":"authenticated"}';

SELECT throws_ok(
  $$ SELECT public.create_friend_plan('e3000000-0000-4000-8000-000000000001', 'Amina', false) $$,
  '42501', NULL, 'no plan before the account consent');
INSERT INTO public.account_consents (consent_version, consent_language, age_group)
VALUES ('2026-10-20', 'en', '18_plus');
SELECT throws_ok(
  $$ SELECT public.create_friend_plan('e3000000-0000-4000-8000-000000000002', 'Amina', false) $$,
  '22023', NULL, 'no plan for an ended event');
SELECT throws_ok(
  $$ SELECT public.create_friend_plan('e3000000-0000-4000-8000-000000000001', repeat('x', 41), false) $$,
  '22023', NULL, 'the owner name is at most 40 characters');
UPDATE ctx SET plan_token = (
  SELECT token FROM public.create_friend_plan('e3000000-0000-4000-8000-000000000001', ' Amina ', false));
SELECT isnt((SELECT plan_token FROM ctx), NULL, 'a plan gets a token');
SELECT is(
  (SELECT row(owner_name, expires_at > now() + interval '3 days')::TEXT
   FROM public.friend_plans WHERE token = (SELECT plan_token FROM ctx)),
  '(Amina,t)', 'the name is trimmed and the plan expires after the event');
SELECT throws_ok(
  $$ SELECT public.create_friend_plan('e3000000-0000-4000-8000-000000000001', NULL, false) $$,
  '23505', NULL, 'one open plan per event');
RESET ROLE;

-- A friend without an account.
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';

SELECT throws_ok(
  $$ SELECT public.respond_to_friend_plan((SELECT plan_token FROM ctx), 'Bello', 'in',
       NULL, NULL, NULL, false, NULL) $$,
  '22023', NULL, 'an answer needs consent');
SELECT throws_ok(
  $$ SELECT public.respond_to_friend_plan((SELECT plan_token FROM ctx), 'Bello', 'in',
       '2026-10-20', 'en', 'under_18', false, NULL) $$,
  '22023', NULL, 'under 18 needs a guardian');
SELECT throws_ok(
  $$ SELECT public.respond_to_friend_plan((SELECT plan_token FROM ctx), '  ', 'in',
       '2026-10-20', 'en', '18_plus', false, NULL) $$,
  '22023', NULL, 'a first name is needed');
UPDATE ctx SET first_answer = public.respond_to_friend_plan(
  (SELECT plan_token FROM ctx), 'Bello', 'in', '2026-10-20', 'en', '18_plus', false, NULL);
SELECT isnt((SELECT first_answer FROM ctx), NULL, 'an answer returns its own token');

SELECT is(
  (SELECT row(public.get_friend_plan((SELECT plan_token FROM ctx)) -> 'counts' ->> 'in',
              public.get_friend_plan((SELECT plan_token FROM ctx)) -> 'names')::TEXT),
  '(1,)', 'a private plan shows counts and no names');
SELECT is(public.get_friend_plan((SELECT plan_token FROM ctx)) ->> 'title',
  'pgtap friends event', 'the friend sees the event');
SELECT is(public.get_friend_plan(gen_random_uuid()), NULL, 'an unknown link finds nothing');

-- Changing one's own answer needs its token.
SELECT public.respond_to_friend_plan((SELECT plan_token FROM ctx), 'Bello', 'maybe',
  '2026-10-20', 'en', '18_plus', false, (SELECT first_answer FROM ctx));
SELECT is(
  (SELECT row(public.get_friend_plan((SELECT plan_token FROM ctx)) -> 'counts' ->> 'in',
              public.get_friend_plan((SELECT plan_token FROM ctx)) -> 'counts' ->> 'maybe')::TEXT),
  '(0,1)', 'the same person changes their answer instead of adding one');
SELECT throws_ok(
  $$ SELECT count(*) FROM public.friend_plan_responses $$,
  '42501', NULL, 'anon cannot read answers directly');
RESET ROLE;

-- The owner turns names on: the earlier answer stays private.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"a3000000-0000-4000-8000-00000000000a","role":"authenticated"}';
UPDATE public.friend_plans SET show_names = true WHERE token = (SELECT plan_token FROM ctx);
SELECT is(
  (SELECT count(*)::INT FROM public.friend_plan_responses),
  1, 'the owner reads the answers of their plan');
RESET ROLE;

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
UPDATE ctx SET second_answer = public.respond_to_friend_plan(
  (SELECT plan_token FROM ctx), 'Chi', 'in', '2026-10-20', 'fr', '18_plus', false, NULL);
SELECT is(
  public.get_friend_plan((SELECT plan_token FROM ctx)) -> 'names',
  '[{"name": "Chi", "answer": "in"}]'::jsonb,
  'an open plan shows only answers given while names were shown');

-- Removing one's own answer.
SELECT is(public.remove_friend_plan_response((SELECT plan_token FROM ctx), gen_random_uuid()),
  false, 'another token removes nothing');
SELECT is(public.remove_friend_plan_response((SELECT plan_token FROM ctx), (SELECT second_answer FROM ctx)),
  true, 'a friend removes their own answer');
RESET ROLE;

-- Others see nothing of the plan.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"a3000000-0000-4000-8000-00000000000b","role":"authenticated"}';
SELECT is((SELECT count(*)::INT FROM public.friend_plans), 0, 'another user sees no plans');
SELECT is((SELECT count(*)::INT FROM public.friend_plan_responses), 0, 'or answers');
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"sub":"a3000000-0000-4000-8000-00000000000c","role":"authenticated"}';
SELECT is((SELECT count(*)::INT FROM public.friend_plan_responses), 0,
  'a curator cannot read friends'' answers');
RESET ROLE;

-- Closed plans refuse answers.
UPDATE public.friend_plans SET closed = true WHERE token = (SELECT plan_token FROM ctx);
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
SELECT throws_ok(
  $$ SELECT public.respond_to_friend_plan((SELECT plan_token FROM ctx), 'Dede', 'in',
       '2026-10-20', 'en', '18_plus', false, NULL) $$,
  '22023', NULL, 'a closed plan takes no answers');
SELECT is(public.get_friend_plan((SELECT plan_token FROM ctx)) ->> 'status', 'closed',
  'and says it is closed');
RESET ROLE;

-- Retention deletes expired plans and their answers.
UPDATE public.friend_plans SET expires_at = now() - interval '1 minute'
WHERE token = (SELECT plan_token FROM ctx);
SELECT public.apply_retention();
SELECT is((SELECT count(*)::INT FROM public.friend_plans WHERE token = (SELECT plan_token FROM ctx)),
  0, 'an expired plan is deleted');
SELECT is((SELECT count(*)::INT FROM public.friend_plan_responses
           WHERE response_token = (SELECT first_answer FROM ctx)),
  0, 'with its answers');

SELECT hasnt_function('public', 'respond_to_friend_plan', ARRAY['uuid', 'text', 'text'],
  'the old answer function without consent is gone');

SELECT * FROM finish();
ROLLBACK;
