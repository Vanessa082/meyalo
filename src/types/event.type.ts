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
  // Identity
  id: string;
  slug: string;
  title: string;
  normalizedTitle: string;

  // Content
  shortDescription?: string;
  description?: string;

  // Classification
  primaryCategoryId: string;
  categoryIds: string[];
  taxonomyNodeIds: string[];
  tags: string[];

  // Organizer
  organizerId: string;

  // Time / lifecycle
  status: EventStatus;
  timezone: string;
  registrationOpensAt?: string;
  registrationDeadline?: string;

  // Format
  format: EventFormat;

  // Location
  venueId?: string;
  virtualUrl?: string;

  // Pricing
  priceType: PriceType;
  currency?: string;
  priceMin?: number;
  priceMax?: number;

  // Registration
  registrationUrl?: string;

  // Audience
  audience?: string;
  eligibilitySummary?: string;
  languages: string[];

  // Media
  coverImageUrl?: string;

  // Platform lifecycle
  visibility: EventVisibility;
  firstSeenAt: string;
  publishedAt?: string;
  lastCheckedAt?: string;
  lastChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventType =
  | 'conference'
  | 'summit'
  | 'workshop'
  | 'training'
  | 'webinar'
  | 'seminar'
  | 'masterclass'
  | 'bootcamp'
  | 'networking'
  | 'meetup'
  | 'career_fair'
  | 'job_fair'
  | 'trade_fair'
  | 'expo'
  | 'information_session'
  | 'open_day'
  | 'panel'
  | 'roundtable'
  | 'community_gathering'
  | 'hackathon'
  | 'competition'
  | 'challenge'
  | 'pitch_event'
  | 'demo_day'
  | 'accelerator'
  | 'incubator'
  | 'fellowship'
  | 'mentorship'
  | 'professional_association_event'
  | 'research_event'
  | 'policy_event'
  | 'other';

export interface EventOccurrence {
  id: string;
  eventId: string;

  startsAt: string;
  endsAt?: string;
  timezone: string;

  venueId?: string;

  sequence?: number;
  isCancelled: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface Venue {
  id: string;

  name?: string;
  addressLine?: string;

  city: string;
  region?: string;
  countryCode: string;

  latitude?: number;
  longitude?: number;

  // PostGIS geometry in database
  geography?: unknown;

  locationPrecision: 'exact' | 'approximate' | 'city_only' | 'unknown';

  accessibilityNotes?: string;
}

export interface Organizer {
  id: string;

  name: string;
  slug: string;

  description?: string;
  websiteUrl?: string;

  logoUrl?: string;

  countryCode?: string;
  city?: string;

  organizerType?:
    | 'company'
    | 'nonprofit'
    | 'community'
    | 'government'
    | 'educational_institution'
    | 'professional_association'
    | 'individual'
    | 'international_organization'
    | 'other';

  createdAt: string;
  updatedAt: string;
}

export interface EventAudience {
  eventId: string;

  audienceType: string;

  minAge?: number;
  maxAge?: number;

  professionIds?: string[];
  sectorIds?: string[];

  experienceLevels?: Array<
    'student' | 'entry_level' | 'mid_level' | 'senior' | 'founder' | 'any'
  >;
}

export interface EventEligibility {
  eventId: string;

  summary?: string;

  minAge?: number;
  maxAge?: number;

  eligibleCountryCodes?: string[];
  eligibleRegions?: string[];

  genderRestriction?: string;

  studentOnly?: boolean;
  professionalOnly?: boolean;

  requiresMembership?: boolean;
  requiresInvitation?: boolean;
  requiresApplication?: boolean;

  otherRequirements?: string[];
}

export interface EventLanguage {
  eventId: string;
  languageCode: string;

  role: 'primary' | 'supported' | 'translation_available';
}

export interface EventPricing {
  eventId: string;

  type: 'free' | 'free_with_registration' | 'paid' | 'variable' | 'unknown';

  currency?: string;

  minimumAmount?: number;
  maximumAmount?: number;

  pricingNotes?: string;

  verifiedAt?: string;
}

export interface EventSource {
  id: string;
  eventId: string;

  sourceType:
    | 'organizer_website'
    | 'organizer_social'
    | 'ticketing_platform'
    | 'event_platform'
    | 'partner_feed'
    | 'community_submission'
    | 'institution_website'
    | 'other';

  url: string;

  sourceName?: string;

  isPrimarySource: boolean;

  discoveredAt: string;
  lastCheckedAt?: string;

  status: 'active' | 'unavailable' | 'changed' | 'unknown';
}

export interface EventClaim {
  id: string;

  eventId: string;
  sourceId: string;

  field:
    | 'title'
    | 'start_time'
    | 'end_time'
    | 'venue'
    | 'price'
    | 'registration_deadline'
    | 'format'
    | 'status'
    | 'eligibility';

  value: unknown;

  observedAt: string;
}

export interface EventConflict {
  id: string;
  eventId: string;

  field: string;

  severity: 'low' | 'medium' | 'high';

  status: 'open' | 'resolved' | 'dismissed';

  detectedAt: string;
  resolvedAt?: string;
}

export interface EventTrustAssessment {
  eventId: string;

  sourceConfidence: 'low' | 'medium' | 'high';

  organizerIdentity: 'unverified' | 'claimed' | 'verified';

  informationIntegrity: 'uncertain' | 'partially_confirmed' | 'confirmed';

  freshness: 'stale' | 'aging' | 'recent';

  registrationSafety: 'unknown' | 'normal' | 'suspicious' | 'blocked';

  hasConflicts: boolean;

  lastAssessedAt: string;
}

export interface EventChange {
  id: string;
  eventId: string;

  field: string;

  previousValue: unknown;
  newValue: unknown;

  sourceId?: string;

  detectedAt: string;

  significance: 'minor' | 'important' | 'critical';
}

export interface EventModeration {
  eventId: string;

  state: 'pending' | 'approved' | 'needs_review' | 'rejected' | 'quarantined';

  riskLevel: 'low' | 'medium' | 'high';

  reason?: string;

  reviewedBy?: string;
  reviewedAt?: string;
}

export type RelevanceReason =
  | { type: 'interest'; value: string }
  | { type: 'profession'; value: string }
  | { type: 'goal'; value: string }
  | { type: 'adjacent_interest'; value: string }
  | { type: 'nearby'; distanceKm: number }
  | { type: 'free' }
  | { type: 'preferred_format'; value: EventFormat };

export interface EventRecommendation {
  eventId: string;
  userId: string;

  layer: 'for_you' | 'explore' | 'around_you';

  score: number;

  reasons: RelevanceReason[];
}

export interface SavedEvent {
  userId: string;
  eventId: string;
  savedAt: string;
}

export interface Attendance {
  userId: string;
  eventId: string;

  status: 'attended' | 'did_not_attend' | 'unknown';

  recordedAt: string;
}

export interface RegistrationAction {
  userId: string;
  eventId: string;

  status: 'registration_clicked' | 'user_marked_registered';

  recordedAt: string;
}

export interface EventMedia {
  id: string;
  eventId: string;

  type: 'cover' | 'flyer' | 'gallery';

  url: string;

  altText?: string;

  sourceId?: string;

  width?: number;
  height?: number;

  createdAt: string;
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

  // Derived for this user's discovery request
  distanceKm?: number;
  isSaved?: boolean;
}
