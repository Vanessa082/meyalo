-- ----------------------------------------------------------------------------
-- DEVELOPMENT FIXTURES. Not production data.
-- Five upcoming-relative events so a fresh database is not empty.
-- They have not been curator-checked, so they stay unreviewed drafts.
-- Price is unknown because these rows do not state one.
-- Timezone is Africa/Douala because these fixtures are in Cameroon.
-- ----------------------------------------------------------------------------

INSERT INTO public.organizers (name) VALUES
  ('Cameroon Chamber of Commerce & Industry'),
  ('Product Tank Africa'),
  ('Silicon Mountain Community'),
  ('AgriBiz Africa Network'),
  ('Google Developer Group Yaoundé');

INSERT INTO public.events (
  title,
  description,
  format,
  category,
  start_at,
  end_at,
  city,
  country_code,
  venue_name,
  address,
  latitude,
  longitude,
  organizer_name,
  organizer_id,
  source_url,
  source_type,
  timezone,
  price_type,
  publication_status,
  verification_state,
  last_checked_at
)
SELECT
  fixture.title,
  fixture.description,
  fixture.format,
  fixture.category,
  fixture.start_at,
  fixture.end_at,
  fixture.city,
  fixture.country_code,
  fixture.venue_name,
  fixture.address,
  fixture.latitude,
  fixture.longitude,
  fixture.organizer_name,
  organizer.id,
  fixture.source_url,
  'organizer_site',
  'Africa/Douala',
  'unknown',
  'draft',
  'unreviewed',
  NULL
FROM (
  VALUES
    (
      'SME Access to Capital & Tax Masterclass',
      'Practical session for entrepreneurs and financial officers on local tax compliance, accounting standards, and debt financing strategies for small businesses in Cameroon.',
      'in_person',
      'Business & Finance',
      now() + interval '1 day' + interval '9 hours',
      now() + interval '1 day' + interval '13 hours',
      'Yaoundé',
      'CM',
      'Hotel La Falaise',
      'Avenue Maréchal Foch, Bastos, Yaoundé',
      3.8650,
      11.5150,
      'Cameroon Chamber of Commerce & Industry',
      'https://ccima.cm/events/sme-tax-masterclass-2026'
    ),
    (
      'Pan-African Product Leadership Virtual Summit',
      'Join tech leads, product managers, and software engineers across Africa to discuss scaling digital products and user research in emerging markets.',
      'virtual',
      'Technology & Career',
      now() + interval '2 days' + interval '14 hours',
      now() + interval '2 days' + interval '18 hours',
      NULL,
      NULL,
      'Zoom Webinars',
      NULL,
      NULL,
      NULL,
      'Product Tank Africa',
      'https://producttank.africa/summit-2026'
    ),
    (
      'Silicon Mountain Tech & Angel Pitch Night',
      'Monthly gathering for software developers, founders, and tech enthusiasts in Buea. Features startup demos and investor Q&A.',
      'in_person',
      'Entrepreneurship & Tech',
      now() + interval '4 days' + interval '17 hours',
      now() + interval '4 days' + interval '20 hours',
      'Buea',
      'CM',
      'ActivSpaces Buea Hub',
      'Check Point, Molyko, Buea',
      4.1560,
      9.2310,
      'Silicon Mountain Community',
      'https://siliconmountain.cm/pitch-night'
    ),
    (
      'Women in Agribusiness & Export Forum 2026',
      'Hybrid conference highlighting agricultural supply chain innovations, export standards, and funding opportunities.',
      'hybrid',
      'Agriculture & Trade',
      now() + interval '6 days' + interval '10 hours',
      now() + interval '6 days' + interval '16 hours',
      'Douala',
      'CM',
      'Douala Grand Mall Conference Hall',
      'Aéroport International de Douala, Akwa, Douala',
      4.0320,
      9.7020,
      'AgriBiz Africa Network',
      'https://agribiz.africa/women-export-forum'
    ),
    (
      'AI & Mobile Engineering Masterclass: Expo & React Native',
      'Technical workshop covering performance, offline sync, and mobile interface design.',
      'virtual',
      'Software Development',
      now() + interval '8 days' + interval '15 hours',
      now() + interval '8 days' + interval '17 hours',
      NULL,
      NULL,
      'Google Meet',
      NULL,
      NULL,
      NULL,
      'Google Developer Group Yaoundé',
      'https://gdg.community.dev/events/yaounde-rn-masterclass'
    )
) AS fixture (
  title,
  description,
  format,
  category,
  start_at,
  end_at,
  city,
  country_code,
  venue_name,
  address,
  latitude,
  longitude,
  organizer_name,
  source_url
)
JOIN public.organizers AS organizer ON organizer.name = fixture.organizer_name;

INSERT INTO public.event_languages (event_id, language_code)
SELECT id, 'en' FROM public.events
ON CONFLICT DO NOTHING;

INSERT INTO public.event_topics (event_id, topic_id)
SELECT event.id, topic.topic_id
FROM public.events AS event
JOIN (
  VALUES
    ('SME Access to Capital & Tax Masterclass', 'business'),
    ('SME Access to Capital & Tax Masterclass', 'finance'),
    ('Pan-African Product Leadership Virtual Summit', 'technology'),
    ('Pan-African Product Leadership Virtual Summit', 'careers'),
    ('Silicon Mountain Tech & Angel Pitch Night', 'technology'),
    ('Silicon Mountain Tech & Angel Pitch Night', 'business'),
    ('Women in Agribusiness & Export Forum 2026', 'agriculture'),
    ('AI & Mobile Engineering Masterclass: Expo & React Native', 'technology'),
    ('AI & Mobile Engineering Masterclass: Expo & React Native', 'learning')
) AS topic (title, topic_id) ON topic.title = event.title
ON CONFLICT DO NOTHING;

INSERT INTO public.event_offers (event_id, offer_id)
SELECT event.id, offer.offer_id
FROM public.events AS event
JOIN (
  VALUES
    ('SME Access to Capital & Tax Masterclass', 'learning'),
    ('Silicon Mountain Tech & Angel Pitch Night', 'funding'),
    ('Silicon Mountain Tech & Angel Pitch Night', 'networking'),
    ('AI & Mobile Engineering Masterclass: Expo & React Native', 'learning')
) AS offer (title, offer_id) ON offer.title = event.title
ON CONFLICT DO NOTHING;
