-- ----------------------------------------------------------------------------
-- MEYALO 003: DOMAIN MODEL
-- Extends the existing events table. Safe on a clean database after 001+002
-- and on the current database (duplicated fixture rows, is_verified, status).
-- Does not implement feature workflows (no auto-moderation, no ingestion).
-- ----------------------------------------------------------------------------

-- 1. Remove confirmed duplicate fixture rows. Keep the earliest row per title
--    and source. Real curation dedupe comes later; this only cleans the seed
--    that was applied twice.
DELETE FROM public.events AS duplicate
USING public.events AS kept
WHERE duplicate.title = kept.title
  AND duplicate.source_url = kept.source_url
  AND (
    duplicate.created_at > kept.created_at
    OR (
      duplicate.created_at = kept.created_at
      AND duplicate.id > kept.id
    )
  );

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE public.verification_state AS ENUM (
    'unreviewed',
    'source_confirmed',
    'organizer_confirmed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.publication_status AS ENUM (
    'draft',
    'published',
    'under_review',
    'cancelled',
    'ended'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Events: identity stays. Add the domain columns the old table cannot express.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS verification_state public.verification_state,
  ADD COLUMN IF NOT EXISTS publication_status public.publication_status,
  ADD COLUMN IF NOT EXISTS organizer_id UUID,
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS currency CHAR(3),
  ADD COLUMN IF NOT EXISTS price_min NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS price_max NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_by UUID,
  ADD COLUMN IF NOT EXISTS source_submission_id UUID;

-- Publication: map the old lifecycle enum onto the publication states.
-- 'updated' was not a visibility state; those rows stay published.
-- 'needs_review' becomes under_review (hidden from discovery).
UPDATE public.events
SET publication_status = CASE status::text
  WHEN 'published' THEN 'published'::public.publication_status
  WHEN 'updated' THEN 'published'::public.publication_status
  WHEN 'needs_review' THEN 'under_review'::public.publication_status
  WHEN 'cancelled' THEN 'cancelled'::public.publication_status
  WHEN 'ended' THEN 'ended'::public.publication_status
  ELSE 'draft'::public.publication_status
END
WHERE publication_status IS NULL;

-- The old is_verified boolean is not a curator check. Do not promote it to
-- source_confirmed. Historical rows stay unreviewed, and unreviewed rows
-- cannot stay published.
UPDATE public.events
SET verification_state = 'unreviewed'
WHERE verification_state IS NULL;

UPDATE public.events
SET publication_status = 'draft'
WHERE verification_state = 'unreviewed'
  AND publication_status = 'published';

-- The original check only allows physical/virtual/hybrid. Drop it before
-- rewriting physical rows, or that update is rejected.
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_format_check;

UPDATE public.events
SET
  format = 'in_person',
  updated_at = COALESCE(updated_at, created_at, now())
WHERE format = 'physical';

UPDATE public.events
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

-- 'Virtual' was a placeholder city because city used to be required.
ALTER TABLE public.events ALTER COLUMN city DROP NOT NULL;

UPDATE public.events
SET city = NULL
WHERE city = 'Virtual';

UPDATE public.events
SET country_code = 'CM'
WHERE country_code IS NULL
  AND city IS NOT NULL;

-- Null means the price was never stated. An explicit 'free' is kept.
UPDATE public.events
SET price_type = 'unknown'
WHERE price_type IS NULL;

-- WAT is an abbreviation, not an IANA timezone. Only the Cameroon fixtures
-- that used that abbreviation are set to Africa/Douala. Other rows are left
-- for a curator to classify.
UPDATE public.events
SET timezone = 'Africa/Douala'
WHERE source_url IN (
  'https://ccima.cm/events/sme-tax-masterclass-2026',
  'https://producttank.africa/summit-2026',
  'https://siliconmountain.cm/pitch-night',
  'https://agribiz.africa/women-export-forum',
  'https://gdg.community.dev/events/yaounde-rn-masterclass'
)
AND (timezone IS NULL OR timezone = 'WAT');

ALTER TABLE public.events ALTER COLUMN timezone DROP DEFAULT;

-- official_website was the old column default, not a curator classification.
-- It is normalized to the provenance vocabulary. Verification stays unreviewed.
UPDATE public.events
SET source_type = 'organizer_site'
WHERE source_type = 'official_website';

ALTER TABLE public.events ALTER COLUMN source_type DROP DEFAULT;
ALTER TABLE public.events ALTER COLUMN source_type SET NOT NULL;

ALTER TABLE public.events
  ALTER COLUMN verification_state SET NOT NULL,
  ALTER COLUMN verification_state SET DEFAULT 'unreviewed',
  ALTER COLUMN publication_status SET NOT NULL,
  ALTER COLUMN publication_status SET DEFAULT 'draft',
  ALTER COLUMN price_type SET DEFAULT 'unknown',
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN city DROP NOT NULL;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_format_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_format_check
  CHECK (format IN ('in_person', 'virtual', 'hybrid'));

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_published_are_reviewed;
ALTER TABLE public.events
  ADD CONSTRAINT events_published_are_reviewed
  CHECK (
    publication_status <> 'published'
    OR verification_state IN ('source_confirmed', 'organizer_confirmed')
  );

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_time_order;
ALTER TABLE public.events
  ADD CONSTRAINT events_time_order
  CHECK (end_at IS NULL OR end_at >= start_at);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_country_code_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_country_code_check
  CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_currency_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_currency_check
  CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_price_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_price_type_check
  CHECK (
    price_type IN (
      'free',
      'paid',
      'free_with_registration',
      'variable',
      'unknown'
    )
  );

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_price_range;
ALTER TABLE public.events
  ADD CONSTRAINT events_price_range
  CHECK (
    (price_min IS NULL OR price_min >= 0)
    AND (price_max IS NULL OR price_max >= 0)
    AND (price_min IS NULL OR price_max IS NULL OR price_min <= price_max)
    AND (price_min IS NULL OR currency IS NOT NULL)
  );

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_coordinates;
ALTER TABLE public.events
  ADD CONSTRAINT events_coordinates
  CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (
      latitude BETWEEN -90 AND 90
      AND longitude BETWEEN -180 AND 180
    )
  );

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_source_type_check
  CHECK (
    source_type IN (
      'organizer_site',
      'social_post',
      'partner_feed',
      'user_suggestion',
      'organizer_submission',
      'collector'
    )
  );

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_url_https;
ALTER TABLE public.events
  ADD CONSTRAINT events_source_url_https
  CHECK (source_url ~ '^https://');

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_registration_url_https;
ALTER TABLE public.events
  ADD CONSTRAINT events_registration_url_https
  CHECK (registration_url IS NULL OR registration_url ~ '^https://');

-- Replace the old publication enum. Indexes and policies that use it go first.
DROP INDEX IF EXISTS public.idx_events_status_start_at;
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
DROP POLICY IF EXISTS "Allow public read access to published events" ON public.events;

ALTER TABLE public.events ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.events DROP COLUMN status;
DROP TYPE public.event_status;

ALTER TABLE public.events DROP COLUMN is_verified;

-- 4. Reference data
CREATE TABLE IF NOT EXISTS public.topics (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.topics (id) VALUES
  ('technology'),
  ('business'),
  ('careers'),
  ('learning'),
  ('finance'),
  ('agriculture'),
  ('health'),
  ('creative_media'),
  ('culture'),
  ('community'),
  ('climate'),
  ('public_policy')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT offers_id_check CHECK (
    id IN (
      'learning',
      'networking',
      'hiring',
      'funding',
      'pitching',
      'speaking'
    )
  )
);

INSERT INTO public.offers (id) VALUES
  ('learning'),
  ('networking'),
  ('hiring'),
  ('funding'),
  ('pitching'),
  ('speaking')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organizers_website_https CHECK (
    website IS NULL OR website ~ '^https://'
  )
);

INSERT INTO public.organizers (name)
SELECT DISTINCT organizer_name
FROM public.events
WHERE organizer_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organizers existing
    WHERE existing.name = events.organizer_name
  );

UPDATE public.events AS event
SET organizer_id = organizer.id
FROM public.organizers AS organizer
WHERE event.organizer_id IS NULL
  AND organizer.name = event.organizer_name;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_organizer_id_fkey
  FOREIGN KEY (organizer_id) REFERENCES public.organizers (id);

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_checked_by_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_checked_by_fkey
  FOREIGN KEY (checked_by) REFERENCES auth.users (id);

CREATE TABLE IF NOT EXISTS public.event_topics (
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES public.topics (id),
  PRIMARY KEY (event_id, topic_id)
);

INSERT INTO public.event_topics (event_id, topic_id)
SELECT event.id, topic.id
FROM public.events AS event
CROSS JOIN LATERAL unnest(event.topics) AS raw (topic_id)
JOIN public.topics AS topic ON topic.id = raw.topic_id
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS public.idx_events_topics;
ALTER TABLE public.events DROP COLUMN IF EXISTS topics;

CREATE TABLE IF NOT EXISTS public.event_offers (
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL REFERENCES public.offers (id),
  PRIMARY KEY (event_id, offer_id)
);

CREATE TABLE IF NOT EXISTS public.event_languages (
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  PRIMARY KEY (event_id, language_code),
  CONSTRAINT event_languages_code_check CHECK (language_code ~ '^[a-z]{2}$')
);

INSERT INTO public.event_languages (event_id, language_code)
SELECT id, lower(language)
FROM public.events
WHERE language ~ '^[A-Za-z]{2}$'
ON CONFLICT DO NOTHING;

ALTER TABLE public.events DROP COLUMN IF EXISTS language;

-- 5. Accounts, intake, trust, planning. Tables only; workflows come later.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role),
  CONSTRAINT user_roles_role_check CHECK (role IN ('admin'))
);

CREATE TABLE IF NOT EXISTS public.organizer_members (
  organizer_id UUID NOT NULL REFERENCES public.organizers (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ,
  verification_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organizer_id, user_id),
  CONSTRAINT organizer_members_method_check CHECK (
    verification_method IS NULL
    OR verification_method IN ('email_domain', 'curator')
  ),
  CONSTRAINT organizer_members_verified_check CHECK (
    (verified_at IS NULL) = (verification_method IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  submitter_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  source_url TEXT,
  note TEXT,
  image_path TEXT,
  raw_text TEXT,
  extracted JSONB,
  status TEXT NOT NULL DEFAULT 'under_review',
  decision_reason TEXT,
  published_event_id UUID REFERENCES public.events (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT submissions_status_check CHECK (
    status IN ('under_review', 'published', 'not_added')
  ),
  CONSTRAINT submissions_has_input CHECK (
    source_url IS NOT NULL
    OR image_path IS NOT NULL
    OR raw_text IS NOT NULL
  ),
  CONSTRAINT submissions_source_url_https CHECK (
    source_url IS NULL OR source_url ~ '^https://'
  )
);

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_source_submission_id_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_source_submission_id_fkey
  FOREIGN KEY (source_submission_id) REFERENCES public.submissions (id);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  reporter_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reports_reason_check CHECK (
    reason IN (
      'cancelled_or_postponed',
      'wrong_datetime',
      'wrong_place',
      'broken_link',
      'scam',
      'duplicate',
      'other'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshot_path TEXT,
  reply_email TEXT,
  app_version TEXT,
  os TEXT,
  locale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feedback_category_check CHECK (
    category IN ('bug', 'idea', 'wrong_event_info', 'other')
  ),
  CONSTRAINT feedback_message_check CHECK (char_length(trim(message)) > 0)
);

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE RESTRICT,
  state TEXT NOT NULL,
  registered BOOLEAN NOT NULL DEFAULT false,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plans_state_check CHECK (state IN ('saved', 'going')),
  CONSTRAINT plans_user_event_unique UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.friend_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE RESTRICT,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  closed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friend_plan_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  friend_plan_id UUID NOT NULL REFERENCES public.friend_plans (id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friend_plan_responses_name_check CHECK (
    char_length(trim(first_name)) BETWEEN 1 AND 40
  ),
  CONSTRAINT friend_plan_responses_answer_check CHECK (
    answer IN ('in', 'maybe', 'cant')
  )
);

CREATE TABLE IF NOT EXISTS public.event_translations (
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  locale TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, field, locale, content_hash),
  CONSTRAINT event_translations_field_check CHECK (
    field IN ('title', 'description')
  ),
  CONSTRAINT event_translations_locale_check CHECK (locale IN ('en', 'fr'))
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_events_publication_start
  ON public.events (publication_status, start_at);
CREATE INDEX IF NOT EXISTS idx_events_verification
  ON public.events (verification_state);
CREATE INDEX IF NOT EXISTS idx_events_organizer
  ON public.events (organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_country_city
  ON public.events (country_code, city);
CREATE INDEX IF NOT EXISTS idx_plans_user
  ON public.plans (user_id, state);
CREATE INDEX IF NOT EXISTS idx_reports_event
  ON public.reports (event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status
  ON public.submissions (status);

-- 7. updated_at, and client-insert guards for protected columns.
-- is_admin is defined here because the insert guards call it. Policies are in 004.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_set_updated_at ON public.events;
CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS organizers_set_updated_at ON public.organizers;
CREATE TRIGGER organizers_set_updated_at
  BEFORE UPDATE ON public.organizers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS plans_set_updated_at ON public.plans;
CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS submissions_set_updated_at ON public.submissions;
CREATE TRIGGER submissions_set_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Client inserts cannot choose someone else's id or set review fields.
CREATE OR REPLACE FUNCTION public.protect_submission_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.status = 'under_review';
    NEW.extracted = NULL;
    NEW.decision_reason = NULL;
    NEW.published_event_id = NULL;
    NEW.submitter_user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_protect_insert ON public.submissions;
CREATE TRIGGER submissions_protect_insert
  BEFORE INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_insert();

CREATE OR REPLACE FUNCTION public.protect_report_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.reporter_user_id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reports_protect_insert ON public.reports;
CREATE TRIGGER reports_protect_insert
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.protect_report_insert();

CREATE OR REPLACE FUNCTION public.protect_feedback_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedback_protect_insert ON public.feedback;
CREATE TRIGGER feedback_protect_insert
  BEFORE INSERT ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.protect_feedback_insert();

CREATE OR REPLACE FUNCTION public.protect_plan_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plans_protect_write ON public.plans;
CREATE TRIGGER plans_protect_write
  BEFORE INSERT OR UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.protect_plan_write();
