/**
 * What an event offers. Ids match the `offers_id_check` constraint in
 * `public.offers` (003_domain_model.sql); labels live in the i18n catalogs
 * under `offers.<id>`.
 */
export const OFFER_IDS = [
  'learning',
  'networking',
  'hiring',
  'funding',
  'pitching',
  'speaking',
] as const;

export type OfferId = (typeof OFFER_IDS)[number];
