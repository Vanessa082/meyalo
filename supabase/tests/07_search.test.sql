-- Explore search (010): accent-insensitive words, filters, past events never.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(19);

INSERT INTO public.events (
  id, title, description, format, category, start_at, end_at, city,
  country_code, organizer_name, source_url, source_type, price_type,
  registration_deadline, publication_status, verification_state
) VALUES
  ('e7000000-0000-4000-8000-000000000001', 'Atelier Zorbex à Yaoundé', 'fixture',
   'in_person', 'Test', now() + interval '2 days', NULL, 'Yaoundé', 'CM',
   'pgtap org one', 'https://example.com/s1', 'organizer_site', 'free',
   NULL, 'published', 'source_confirmed'),
  ('e7000000-0000-4000-8000-000000000002', 'Zorbex pitch night', 'fixture',
   'hybrid', 'Test', now() + interval '3 days', NULL, 'Buea', 'CM',
   'pgtap org two', 'https://example.com/s2', 'organizer_site', 'paid',
   now() - interval '1 hour', 'published', 'source_confirmed'),
  ('e7000000-0000-4000-8000-000000000003', 'Zorbex past', 'fixture',
   'in_person', 'Test', now() - interval '2 days', now() - interval '1 day',
   'Buea', 'CM', 'pgtap org three', 'https://example.com/s3', 'organizer_site',
   'paid', NULL, 'published', 'source_confirmed'),
  ('e7000000-0000-4000-8000-000000000004', 'Zorbex happening now', 'fixture',
   'virtual', 'Test', now() - interval '1 hour', now() + interval '2 hours',
   NULL, NULL, 'pgtap org four', 'https://example.com/s4', 'organizer_site',
   'paid', NULL, 'published', 'source_confirmed'),
  ('e7000000-0000-4000-8000-000000000005', 'Zorbex draft', 'fixture',
   'in_person', 'Test', now() + interval '2 days', NULL, 'Buea', 'CM',
   'pgtap org five', 'https://example.com/s5', 'organizer_site', 'paid',
   NULL, 'draft', 'unreviewed'),
  ('e7000000-0000-4000-8000-000000000006', 'Mentoring breakfast',
   'Hosted with the Zorbex network', 'in_person', 'Test',
   now() + interval '4 days', NULL, 'Douala', 'CM', 'pgtap org six',
   'https://example.com/s6', 'organizer_site', 'variable', NULL, 'published',
   'source_confirmed'),
  ('e7000000-0000-4000-8000-000000000007', 'Zorbex price not stated', 'fixture',
   'in_person', 'Test', now() + interval '5 days', NULL, 'Buea', 'CM',
   'pgtap org seven', 'https://example.com/s7', 'organizer_site', 'unknown',
   NULL, 'published', 'source_confirmed');

INSERT INTO public.event_topics (event_id, topic_id) VALUES
  ('e7000000-0000-4000-8000-000000000001', 'technology'),
  ('e7000000-0000-4000-8000-000000000002', 'business');
INSERT INTO public.event_offers (event_id, offer_id) VALUES
  ('e7000000-0000-4000-8000-000000000001', 'funding');
INSERT INTO public.event_languages (event_id, language_code) VALUES
  ('e7000000-0000-4000-8000-000000000001', 'fr'),
  ('e7000000-0000-4000-8000-000000000002', 'en');

SELECT ok(
  NOT (SELECT prosecdef FROM pg_proc WHERE proname = 'search_public_events'),
  'search runs with the caller''s rights'
);

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';


-- Short names for the fixture ids in assertions.
CREATE OR REPLACE FUNCTION pg_temp.found(ids UUID[]) RETURNS TEXT[]
LANGUAGE sql AS $$
  SELECT coalesce(array_agg(right(id::TEXT, 1) ORDER BY id), '{}')
  FROM unnest(ids) AS id
$$;

SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex'))),
  ARRAY['1', '2', '4', '6', '7'],
  'finds title and description matches; never past or unpublished events'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => '  ZORBEX   yaounde '))),
  ARRAY['1'],
  'ignores case, accents and extra spaces; every word must match'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'yaoundé atelier'))),
  ARRAY['1'],
  'word order does not matter'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', cities => ARRAY['yaounde']))),
  ARRAY['1'],
  'city filter ignores accents'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', formats => ARRAY['hybrid']))),
  ARRAY['2'],
  'format filter'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', prices => ARRAY['free']))),
  ARRAY['1'],
  'free means free or free with registration'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', prices => ARRAY['paid']))),
  ARRAY['2', '4', '6'],
  'paid means paid or a varying price'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', prices => ARRAY['free', 'paid']))),
  ARRAY['1', '2', '4', '6'],
  'both prices together'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', topics => ARRAY['technology']))),
  ARRAY['1'],
  'topic filter'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', offers => ARRAY['funding']))),
  ARRAY['1'],
  'offer filter'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', languages => ARRAY['en']))),
  ARRAY['2'],
  'language filter'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', registration_open => true))),
  ARRAY['1', '4', '6', '7'],
  'registration open leaves out closed registrations'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(
    query => 'zorbex',
    starts_from => now() + interval '1 day',
    starts_before => now() + interval '3 days 12 hours'))),
  ARRAY['1', '2'],
  'date window'
);
-- Real local events may also match, so check only this test's fixtures.
SELECT ok(
  ARRAY(SELECT id FROM public.search_public_events(
    query => 'entrepreneurship', query_topics => ARRAY['business'],
    cities => ARRAY['Buea']))
    @> ARRAY['e7000000-0000-4000-8000-000000000002'::UUID]
  AND NOT ARRAY(SELECT id FROM public.search_public_events(
    query => 'entrepreneurship', query_topics => ARRAY['business'],
    cities => ARRAY['Buea']))
    && ARRAY['e7000000-0000-4000-8000-000000000001'::UUID],
  'a query naming a topic finds events with that topic'
);
SELECT is(
  pg_temp.found(ARRAY(SELECT id FROM public.search_public_events(query => 'zorbex', cities => ARRAY[]::TEXT[]))),
  ARRAY['1', '2', '4', '6', '7'],
  'an empty filter list means no filter'
);
SELECT lives_ok(
  $$SELECT * FROM public.search_public_events(query => repeat('a', 5000))$$,
  'a very long query is cut, not an error'
);
SELECT lives_ok(
  $$SELECT * FROM public.search_public_events(query => '%_\')$$,
  'pattern characters are plain text'
);
SELECT is(
  (SELECT count(*)::INT FROM public.search_public_events(query => '%')),
  0,
  'a percent sign matches only a percent sign'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
