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

export type EventSort = 'start_asc' | 'start_desc' | 'updated_desc';

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
  /** Title, organizer, venue or city. */
  search?: string;
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
  city?: string;
  countryCode?: string;

  priceType: PriceType;
  priceLabel?: string;

  coverImageUrl?: string;
  registrationUrl?: string;
  verificationState?: VerificationState;

  status: 'scheduled' | 'postponed' | 'cancelled' | 'completed';

  trustLabel?: string;
  lastCheckedAt?: string;

  relevanceReasons?: string[];

  distanceKm?: number;
  distanceText?: string;
  dateBadgeText?: string;
  dateFormatted?: string;
  subtitleCategories?: string;
  verificationText?: string;
  sourceUrl?: string;
  description?: string;
  isSaved?: boolean;
}
