export type EventStatus =
  | 'draft'
  | 'scheduled'
  | 'registration_open'
  | 'registration_closed'
  | 'sold_out'
  | 'postponed'
  | 'cancelled'
  | 'completed';

export type EventFormat = 'in_person' | 'virtual' | 'hybrid';

export type PriceType =
  | 'free'
  | 'paid'
  | 'free_with_registration'
  | 'variable'
  | 'unknown';

export type EventVisibility =
  | 'published'
  | 'under_review'
  | 'hidden'
  | 'rejected';

export interface Event {
  id: string;
  slug: string;
  title: string;
  normalizedTitle: string;

  shortDescription?: string;
  description?: string;

  primaryCategoryId: string;
  categoryIds: string[];
  taxonomyNodeIds: string[];
  tags: string[];

  organizerId: string;

  status: EventStatus;
  timezone: string;
  registrationOpensAt?: string;
  registrationDeadline?: string;

  format: EventFormat;

  venueId?: string;
  virtualUrl?: string;

  priceType: PriceType;
  currency?: string;
  priceMin?: number;
  priceMax?: number;

  registrationUrl?: string;

  audience?: string;
  eligibilitySummary?: string;
  languages: string[];

  coverImageUrl?: string;

  visibility: EventVisibility;
  firstSeenAt: string;
  publishedAt?: string;
  lastCheckedAt?: string;
  lastChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

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

  format: 'in_person' | 'virtual' | 'hybrid';

  venueName?: string;
  city?: string;
  countryCode?: string;

  priceType: 'free' | 'paid' | 'variable' | 'unknown';
  priceLabel?: string;

  coverImageUrl?: string;

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
