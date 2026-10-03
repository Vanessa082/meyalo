/**
 * Event rules that do not depend on storage. The database enforces the same
 * publication transitions (005_curation.sql) and the published/reviewed check
 * (003_domain_model.sql); these functions let the app explain a rejection
 * before it sends a write.
 */
import type {
  Event,
  EventFormat,
  PriceType,
  PublicationStatus,
  SourceType,
  VerificationState,
} from '../types/event.type.ts';

export const EVENT_FORMATS = [
  'in_person',
  'virtual',
  'hybrid',
] as const satisfies readonly EventFormat[];

export const PUBLICATION_STATUSES = [
  'draft',
  'under_review',
  'published',
  'cancelled',
  'ended',
] as const satisfies readonly PublicationStatus[];

export const VERIFICATION_STATES = [
  'unreviewed',
  'source_confirmed',
  'organizer_confirmed',
] as const satisfies readonly VerificationState[];

export const SOURCE_TYPES = [
  'organizer_site',
  'social_post',
  'partner_feed',
  'user_suggestion',
  'organizer_submission',
  'collector',
] as const satisfies readonly SourceType[];

export const PRICE_TYPES = [
  'free',
  'free_with_registration',
  'paid',
  'variable',
  'unknown',
] as const satisfies readonly PriceType[];

export const PUBLICATION_TRANSITIONS: Record<
  PublicationStatus,
  readonly PublicationStatus[]
> = {
  draft: ['published', 'under_review', 'cancelled'],
  under_review: ['published', 'draft', 'cancelled'],
  published: ['under_review', 'cancelled', 'ended'],
  cancelled: ['draft'],
  ended: [],
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const RECHECK_WINDOW_DAYS = 7;
export const STALE_AFTER_DAYS = 14;

export function isConfirmed(state: VerificationState): boolean {
  return state === 'source_confirmed' || state === 'organizer_confirmed';
}

export function isPubliclyVisible(
  event: Pick<Event, 'publicationStatus' | 'verificationState'>,
): boolean {
  return (
    event.publicationStatus === 'published' &&
    isConfirmed(event.verificationState)
  );
}

/**
 * Why a publication change is not allowed, or null when it is.
 */
export function publicationChangeBlocker(
  event: Pick<
    Event,
    'publicationStatus' | 'verificationState' | 'startAt' | 'endAt'
  >,
  to: PublicationStatus,
  now: Date = new Date(),
): string | null {
  const from = event.publicationStatus;
  if (from === to) return `The event is already ${to}.`;
  if (!PUBLICATION_TRANSITIONS[from].includes(to)) {
    return `An event cannot move from ${from} to ${to}.`;
  }
  if (to === 'published') {
    if (!isConfirmed(event.verificationState)) {
      return 'Record a source or organizer check before publishing.';
    }
    const finish = Date.parse(event.endAt ?? event.startAt);
    if (Number.isFinite(finish) && finish < now.getTime()) {
      return 'This event has already finished.';
    }
  }
  return null;
}

export function allowedPublicationChanges(
  event: Pick<
    Event,
    'publicationStatus' | 'verificationState' | 'startAt' | 'endAt'
  >,
  now: Date = new Date(),
): PublicationStatus[] {
  return PUBLICATION_TRANSITIONS[event.publicationStatus].filter(
    (to) => publicationChangeBlocker(event, to, now) === null,
  );
}

/**
 * Why a verification change is not allowed, or null when it is.
 * Recording the same confirmed state again is a re-check, which is allowed.
 */
export function verificationChangeBlocker(
  event: Pick<Event, 'publicationStatus' | 'verificationState'>,
  to: VerificationState,
): string | null {
  if (to === 'unreviewed') {
    if (event.verificationState === 'unreviewed') {
      return 'The event is already unreviewed.';
    }
    if (event.publicationStatus === 'published') {
      return 'Unpublish the event before marking it unreviewed.';
    }
  }
  return null;
}

export type Freshness =
  | { kind: 'not_applicable' }
  | { kind: 'not_reviewed' }
  | { kind: 'never_checked' }
  | { kind: 'stale'; checkedAt: string }
  | { kind: 'recheck_due'; checkedAt: string }
  | { kind: 'fresh'; checkedAt: string };

/**
 * Feature 15: re-check within the 7 days before start; a check 14+ days old
 * means details may have changed.
 */
export function freshness(
  event: Pick<
    Event,
    | 'publicationStatus'
    | 'verificationState'
    | 'lastCheckedAt'
    | 'startAt'
    | 'endAt'
  >,
  now: Date = new Date(),
): Freshness {
  const start = Date.parse(event.startAt);
  const finish = Date.parse(event.endAt ?? event.startAt);
  if (
    event.publicationStatus === 'cancelled' ||
    event.publicationStatus === 'ended' ||
    (Number.isFinite(finish) && finish < now.getTime())
  ) {
    return { kind: 'not_applicable' };
  }
  if (!isConfirmed(event.verificationState)) return { kind: 'not_reviewed' };
  if (!event.lastCheckedAt) return { kind: 'never_checked' };

  const checked = Date.parse(event.lastCheckedAt);
  if (!Number.isFinite(checked)) return { kind: 'never_checked' };
  const checkedAt = event.lastCheckedAt;

  if (now.getTime() - checked >= STALE_AFTER_DAYS * DAY_MS) {
    return { kind: 'stale', checkedAt };
  }
  const windowOpens = start - RECHECK_WINDOW_DAYS * DAY_MS;
  if (
    Number.isFinite(start) &&
    now.getTime() >= windowOpens &&
    checked < windowOpens
  ) {
    return { kind: 'recheck_due', checkedAt };
  }
  return { kind: 'fresh', checkedAt };
}

export type CompletenessIssue =
  | 'end_time_missing'
  | 'timezone_missing'
  | 'city_missing'
  | 'country_missing'
  | 'venue_missing'
  | 'coordinates_missing'
  | 'registration_link_missing'
  | 'price_not_stated'
  | 'language_missing'
  | 'topics_missing'
  | 'organizer_not_linked';

export const COMPLETENESS_LABELS: Record<CompletenessIssue, string> = {
  end_time_missing: 'End time not stated',
  timezone_missing: 'Timezone not stated',
  city_missing: 'City missing',
  country_missing: 'Country missing',
  venue_missing: 'Venue to be confirmed',
  coordinates_missing: 'Not pinned on the map',
  registration_link_missing: 'No registration link (source link is used)',
  price_not_stated: 'Price not stated',
  language_missing: 'Event language not stated',
  topics_missing: 'No topics',
  organizer_not_linked: 'Organizer not linked to an organizer record',
};

/**
 * Information a curator should fill or confirm. These do not block saving;
 * the database and validation enforce what is required.
 */
export function completenessIssues(event: Event): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  const physical = event.format === 'in_person' || event.format === 'hybrid';

  if (!event.endAt) issues.push('end_time_missing');
  if (!event.timezone) issues.push('timezone_missing');
  if (physical) {
    if (!event.city) issues.push('city_missing');
    if (!event.countryCode) issues.push('country_missing');
    if (!event.venueName) issues.push('venue_missing');
    if (event.latitude === null || event.longitude === null) {
      issues.push('coordinates_missing');
    }
  }
  if (!event.registrationUrl) issues.push('registration_link_missing');
  if (event.priceType === 'unknown') issues.push('price_not_stated');
  if (event.languages.length === 0) issues.push('language_missing');
  if (event.topics.length === 0) issues.push('topics_missing');
  if (!event.organizerId) issues.push('organizer_not_linked');
  return issues;
}

export const PUBLICATION_LABELS: Record<PublicationStatus, string> = {
  draft: 'Draft',
  under_review: 'Under review',
  published: 'Published',
  cancelled: 'Cancelled',
  ended: 'Ended',
};

export const VERIFICATION_LABELS: Record<VerificationState, string> = {
  unreviewed: 'Not reviewed',
  source_confirmed: 'Source confirmed',
  organizer_confirmed: 'Confirmed by organizer',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  organizer_site: 'Organizer site',
  social_post: 'Social post',
  partner_feed: 'Partner feed',
  user_suggestion: 'User suggestion',
  organizer_submission: 'Organizer submission',
  collector: 'Collector',
};

export const FORMAT_LABELS: Record<EventFormat, string> = {
  in_person: 'In person',
  virtual: 'Online',
  hybrid: 'Hybrid',
};

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  free: 'Free',
  free_with_registration: 'Free with registration',
  paid: 'Paid',
  variable: 'Varies',
  unknown: 'Not stated',
};
