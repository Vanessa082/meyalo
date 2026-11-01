/**
 * The shared topic taxonomy. Ids match `public.topics` (003_domain_model.sql);
 * labels live in the i18n catalogs under `topics.<id>`.
 */
export const TOPIC_IDS = [
  'technology',
  'business',
  'careers',
  'learning',
  'finance',
  'agriculture',
  'health',
  'creative_media',
  'culture',
  'community',
  'climate',
  'public_policy',
  'sport_wellbeing',
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

export function isTopicId(value: unknown): value is TopicId {
  return (TOPIC_IDS as readonly unknown[]).includes(value);
}
