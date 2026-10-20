import type { Consent } from './consent.type.ts';
/**
 * The canonical event model. Every layer reads events as `Event`.
 *
 * Boundary shapes are derived from it so they cannot drift:
 * - `EventInput`: what a curator may write (validated).
 * - `EventFormValues`: text fields as typed in a form.
 * - `EventCardData`: the consumer screens' view model, built by `toEventCard`.
 * Database rows stay private to the repository.
 */

export type EventFormat = 'in_person' | 'virtual' | 'hybrid';

export type PublicationStatus =
  | 'draft'
  | 'published'
  | 'under_review'
  | 'cancelled'
  | 'ended';

export type VerificationState =
  | 'unreviewed'
  | 'source_confirmed'
  | 'organizer_confirmed';

export type SourceType =
  | 'organizer_site'
  | 'social_post'
  | 'partner_feed'
  | 'user_suggestion'
  | 'organizer_submission'
  | 'collector';

export type PriceType =
  | 'free'
  | 'paid'
  | 'free_with_registration'
  | 'variable'
  | 'unknown';

/** An event image we may use (docs/product-decisions.md, event images). */
export interface CoverImage {
  /** Storage prefix; the files are <path>-640.webp and <path>-1600.webp. */
  path: string;
  /** Public URLs, built by the repository. */
  smallUrl: string;
  largeUrl: string;
  /** What it shows, for screen readers. */
  alt: string;
  credit: string | null;
  /** Curators only; null in public reads. */
  rights: 'organizer_provided' | 'source_permits' | 'own_photo' | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  format: EventFormat;

  /** ISO instants. Display them in `timezone`. */
  startAt: string;
  endAt: string | null;
  /** IANA timezone, e.g. Africa/Douala. Null when not stated. */
  timezone: string | null;
  registrationDeadline: string | null;

  city: string | null;
  /** ISO 3166-1 alpha-2, uppercase. */
  countryCode: string | null;
  venueName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  virtualAccessType: string | null;

  organizerId: string | null;
  organizerName: string;

  topics: string[];
  offers: string[];
  /** ISO 639-1, lowercase. */
  languages: string[];

  priceType: PriceType;
  /** ISO 4217, uppercase. */
  currency: string | null;
  priceMin: number | null;
  priceMax: number | null;

  sourceUrl: string;
  sourceType: SourceType;
  registrationUrl: string | null;
  sourceSubmissionId: string | null;

  verificationState: VerificationState;
  lastCheckedAt: string | null;
  checkedBy: string | null;
  coverImage: CoverImage | null;
  publicationStatus: PublicationStatus;

  createdAt: string | null;
  updatedAt: string;
}

/** Fields a curator writes when creating or editing. Status, verification and
 *  audit fields change through their own actions. */
export type EventInput = Omit<
  Event,
  | 'id'
  | 'organizerId'
  | 'sourceSubmissionId'
  | 'verificationState'
  | 'lastCheckedAt'
  | 'checkedBy'
  | 'publicationStatus'
  | 'createdAt'
  | 'updatedAt'
  // Set through its own action (setCoverImage), never the event form.
  | 'coverImage'
>;

type ListField = 'topics' | 'offers' | 'languages';

/** Form state: every scalar as typed text, list fields as selections.
 *  Dates are wall-clock "YYYY-MM-DD HH:mm" in the event timezone. */
export type EventFormValues = {
  [K in Exclude<keyof EventInput, ListField>]: string;
} & {
  [K in ListField]: string[];
};

export interface EventTaxonomy {
  topics: string[];
  offers: string[];
}

export type EventSort =
  | 'start_asc'
  | 'start_desc'
  | 'updated_desc'
  | 'created_desc';

export interface EventCursor {
  sort: EventSort;
  /** Raw database value of the sort column, kept at full precision. */
  value: string;
  id: string;
}

export interface EventFilters {
  publicationStatuses?: PublicationStatus[];
  verificationStates?: VerificationState[];
  formats?: EventFormat[];
  category?: string;
  city?: string;
  countryCode?: string;
  /** Inclusive lower bound on start, ISO instant. */
  startsFrom?: string;
  /** Exclusive upper bound on start, ISO instant. */
  startsBefore?: string;
  /** Never checked, or last checked before this ISO instant. */
  lastCheckedBefore?: string;
  /** Only events without coordinates (not on the map). */
  notPinned?: boolean;
  /** Title, organizer, venue or city. */
  search?: string;
}

/** Consumer search (search_public_events, 010). Empty lists mean no filter. */
export interface EventSearchInput {
  query?: string;
  /** Topic ids whose name contains the query, worked out by the app. */
  queryTopics?: string[];
  /** City names, matched without accents. */
  cities?: string[];
  formats?: EventFormat[];
  /** `free`: free or free with registration; `paid`: paid or varying. */
  prices?: ('free' | 'paid')[];
  topics?: string[];
  offers?: string[];
  languages?: string[];
  registrationOpen: boolean;
  startsFrom?: string;
  startsBefore?: string;
}

export interface EventListQuery {
  filters?: EventFilters;
  sort?: EventSort;
  limit?: number;
  cursor?: EventCursor | null;
}

export interface EventPage {
  items: Event[];
  nextCursor: EventCursor | null;
  /** Total matches, when the query asked for a count (first search page). */
  total?: number;
}

/** Consumer view model for the existing discovery screens. */
export interface EventCardData {
  id: string;
  slug: string;

  title: string;
  organizerName: string;

  eventType: string;
  primaryCategory: string;

  startsAt: string;
  endsAt?: string;
  timezone: string;

  format: EventFormat;

  venueName?: string;
  /** Street address, when the curator recorded one. */
  address?: string;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;

  /** Taxonomy ids, matched against the discovery profile. */
  topics: string[];
  offers: string[];
  /** ISO 639-1, lowercase. */
  languages: string[];

  priceType: PriceType;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;

  /** 640 px, for cards. */
  coverImageUrl?: string;
  /** 1600 px, for the event page. */
  coverImageLargeUrl?: string;
  coverImageAlt?: string;
  coverImageCredit?: string;
  registrationUrl?: string;
  /** ISO instant; registration closes then. */
  registrationDeadline?: string;
  verificationState?: VerificationState;

  status: 'scheduled' | 'postponed' | 'cancelled' | 'completed';

  lastCheckedAt?: string;

  relevanceReasons?: string[];

  distanceKm?: number;
  distanceText?: string;
  subtitleCategories?: string;
  sourceUrl?: string;
  description?: string;
  isSaved?: boolean;
}

/** Mirrors `reports_reason_check` in 003_domain_model.sql. */
export const REPORT_REASONS = [
  'cancelled_or_postponed',
  'wrong_datetime',
  'wrong_place',
  'broken_link',
  'scam',
  'duplicate',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_NOTE_MAX = 500;

/** A problem a user reports about a published event. Anonymous allowed. */
export interface EventReportInput {
  eventId: string;
  reason: ReportReason;
  note: string | null;
  /** Made once per report on the device; a replay with the same id is
   *  recognised by the database as already saved. */
  clientRequestId: string;
  /** What the reporter agreed to (012_consent.sql refuses a report without). */
  consent: Consent;
}

/** How a curator confirmed an event (public.check_method). */
export type CheckMethod =
  | 'official_site'
  | 'official_social'
  | 'organizer_contact'
  | 'partner_feed';

/** Mirrors event_checks_red_flags_known in 007_verification.sql. */
export const RED_FLAGS = [
  'guaranteed_award',
  'payment_to_personal_account',
  'free_email_contact_only',
  'lookalike_domain',
  'pressure_to_pay_or_decide',
  'asks_card_or_bank_details',
] as const;

export type RedFlag = (typeof RED_FLAGS)[number];

export const CHECK_NOTES_MAX = 2000;

/** What a curator records. `unreviewed` means the check rejects the event. */
export interface EventCheckInput {
  eventId: string;
  state: VerificationState;
  method: CheckMethod;
  evidenceUrl: string;
  redFlags: RedFlag[];
  chargesFee: boolean;
  notes: string | null;
}

export type CheckResult = 'confirmed' | 'needs_second_review' | 'rejected';

export interface EventCheck {
  id: string;
  eventId: string;
  checkedBy: string;
  method: CheckMethod;
  outcome: 'confirmed' | 'rejected';
  state: VerificationState;
  evidenceUrl: string;
  redFlags: RedFlag[];
  chargesFee: boolean;
  notes: string | null;
  createdAt: string;
}

/** A report as curators see it. */
export interface EventReport {
  id: string;
  reason: ReportReason;
  note: string | null;
  createdAt: string;
}
