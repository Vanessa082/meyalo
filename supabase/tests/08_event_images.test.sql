-- Event images (011): rights stated with every image, public fields only,
-- and only curators can write to the event-images bucket.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(12);

INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-000000000081', 'pgtap-images-curator@meyalo.local'),
  ('c0000000-0000-4000-8000-000000000082', 'pgtap-images-member@meyalo.local');
INSERT INTO public.user_roles (user_id, role) VALUES
  ('c0000000-0000-4000-8000-000000000081', 'admin');

INSERT INTO public.events (
  id, title, description, format, category, start_at, city, country_code,
  organizer_name, source_url, source_type, publication_status, verification_state
) VALUES (
  'e8000000-0000-4000-8000-000000000001', 'pgtap image event', 'fixture',
  'in_person', 'Test', now() + interval '3 days', 'Buea', 'CM',
  'pgtap image org', 'https://example.com/img', 'organizer_site',
  'published', 'source_confirmed'
);

-- 1. An image always comes with its rights and alt text.
SELECT throws_ok(
  $$UPDATE public.events SET cover_image_path = 'e8/x'
    WHERE id = 'e8000000-0000-4000-8000-000000000001'$$,
  '23514', NULL, 'an image without rights and alt text is refused'
);
SELECT throws_ok(
  $$UPDATE public.events
    SET cover_image_path = 'e8/x', cover_image_rights = 'found_online',
        cover_image_alt = 'A speaker on stage'
    WHERE id = 'e8000000-0000-4000-8000-000000000001'$$,
  '23514', NULL, 'only the three rights answers are accepted'
);
SELECT lives_ok(
  $$UPDATE public.events
    SET cover_image_path = 'e8000000-0000-4000-8000-000000000001/a',
        cover_image_rights = 'organizer_provided',
        cover_image_alt = 'A speaker on stage',
        cover_image_credit = 'Photo: the organiser'
    WHERE id = 'e8000000-0000-4000-8000-000000000001'$$,
  'an image with rights and alt text is accepted'
);

-- 2. The public sees the image, its alt text and credit, never the rights.
SET LOCAL ROLE anon;
SELECT is(
  (SELECT cover_image_alt FROM public.events_public
   WHERE id = 'e8000000-0000-4000-8000-000000000001'),
  'A speaker on stage', 'anon reads the alt text through the public view'
);
SELECT is(
  (SELECT cover_image_path FROM public.events_public
   WHERE id = 'e8000000-0000-4000-8000-000000000001'),
  'e8000000-0000-4000-8000-000000000001/a', 'and the image path'
);
SELECT throws_ok(
  'SELECT cover_image_rights FROM public.events',
  '42501', NULL, 'anon cannot read the rights answer'
);
RESET ROLE;

-- 3. The bucket: public reads, 2 MB, images only.
SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'event-images'),
  true, 'the event-images bucket is public'
);
SELECT is(
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'event-images'),
  2097152::BIGINT, 'files are limited to 2 MB'
);
SELECT set_eq(
  $$SELECT unnest(allowed_mime_types) FROM storage.buckets WHERE id = 'event-images'$$,
  ARRAY['image/jpeg', 'image/png', 'image/webp'],
  'only JPEG, PNG and WebP'
);

-- 4. Only curators write to it.
SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('event-images', 'e8000000-0000-4000-8000-000000000001/anon-640.webp')$$,
  '42501', NULL, 'anon cannot upload'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"role":"authenticated","sub":"c0000000-0000-4000-8000-000000000082"}';
SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('event-images', 'e8000000-0000-4000-8000-000000000001/member-640.webp')$$,
  '42501', NULL, 'a signed-in non-curator cannot upload'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO
  '{"role":"authenticated","sub":"c0000000-0000-4000-8000-000000000081"}';
SELECT lives_ok(
  $$INSERT INTO storage.objects (bucket_id, name)
    VALUES ('event-images', 'e8000000-0000-4000-8000-000000000001/curator-640.webp')$$,
  'a curator can upload'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
