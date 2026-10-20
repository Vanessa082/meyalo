/**
 * Test-only fixtures. Not seed data and never written to a shared database.
 */
import type {
  Event,
  EventFormValues,
  EventTaxonomy,
} from '../types/event.type.ts';

export const TAXONOMY: EventTaxonomy = {
  topics: ['business', 'technology'],
  offers: ['learning', 'networking'],
};

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Test meetup',
    description: 'A test event.',
    category: 'Meetup',
    format: 'in_person',
    startAt: '2026-11-10T08:00:00.000Z',
    endAt: '2026-11-10T12:00:00.000Z',
    timezone: 'Africa/Douala',
    registrationDeadline: null,
    city: 'Douala',
    countryCode: 'CM',
    venueName: 'Test venue',
    address: null,
    latitude: 4.05,
    longitude: 9.7,
    virtualAccessType: null,
    organizerId: '22222222-2222-4222-8222-222222222222',
    organizerName: 'Test organizer',
    topics: ['technology'],
    offers: [],
    languages: ['fr'],
    priceType: 'free',
    currency: null,
    priceMin: null,
    priceMax: null,
    sourceUrl: 'https://example.org/event',
    sourceType: 'organizer_site',
    registrationUrl: 'https://example.org/register',
    sourceSubmissionId: null,
    verificationState: 'unreviewed',
    lastCheckedAt: null,
    checkedBy: null,
    coverImage: null,
    publicationStatus: 'draft',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

export function validFormValues(
  overrides: Partial<EventFormValues> = {},
): EventFormValues {
  return {
    title: 'Test meetup',
    description: 'A test event.',
    category: 'Meetup',
    format: 'in_person',
    startAt: '2026-11-10 09:00',
    endAt: '2026-11-10 13:00',
    timezone: 'Africa/Douala',
    registrationDeadline: '',
    city: 'Douala',
    countryCode: 'cm',
    venueName: 'Test venue',
    address: '',
    latitude: '',
    longitude: '',
    virtualAccessType: '',
    organizerName: 'Test organizer',
    topics: ['technology'],
    offers: [],
    languages: ['fr'],
    priceType: 'free',
    currency: '',
    priceMin: '',
    priceMax: '',
    sourceUrl: 'https://example.org/event',
    sourceType: 'organizer_site',
    registrationUrl: '',
    ...overrides,
  };
}
