/**
 * Test-only catalogue for the persona tests (src/services/ranking.personas.
 * test.ts). Plausible events, never shown in the app and never written to a
 * database. "Now" for these is Monday 19 October 2026, 10:00 in Douala.
 */
import type { EventCardData } from '../types/event.type.ts';

export const PERSONA_NOW = new Date('2026-10-19T09:00:00Z');

const DAY = 86_400_000;
/** Douala time (UTC+1): day offset from now, at a local hour. */
const at = (days: number, hour: number) =>
  new Date(Date.UTC(2026, 9, 19 + days, hour - 1)).toISOString();
const checkedDaysAgo = (days: number) =>
  new Date(PERSONA_NOW.getTime() - days * DAY).toISOString();

function e(
  id: string,
  overrides: Partial<EventCardData> & Pick<EventCardData, 'title' | 'startsAt'>,
): EventCardData {
  return {
    id,
    slug: id,
    organizerName: `Organiser ${id}`,
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    timezone: 'Africa/Douala',
    format: 'in_person',
    priceType: 'free',
    priceMin: null,
    priceMax: null,
    currency: null,
    status: 'scheduled',
    topics: [],
    offers: [],
    languages: ['en'],
    verificationState: 'source_confirmed',
    lastCheckedAt: checkedDaysAgo(5),
    ...overrides,
  };
}

export const PERSONA_EVENTS: EventCardData[] = [
  e('buea-ai', {
    title: 'Hands-on AI for students',
    city: 'Buea',
    startsAt: at(5, 9),
    topics: ['technology', 'learning'],
    offers: ['learning'],
  }),
  e('buea-web', {
    title: 'Web development bootcamp',
    city: 'Buea',
    startsAt: at(12, 14),
    topics: ['technology'],
    offers: ['learning'],
  }),
  e('buea-mobile', {
    title: 'Mobile app meetup',
    city: 'Buea',
    startsAt: at(9, 18),
    topics: ['technology'],
    offers: ['networking'],
  }),
  e('buea-cyber', {
    title: 'Cybersecurity basics',
    city: 'Buea',
    startsAt: at(15, 10),
    topics: ['technology'],
    offers: ['learning'],
  }),
  e('buea-pitch', {
    title: 'Startup pitch night',
    city: 'Buea',
    startsAt: at(8, 18),
    topics: ['business'],
    offers: ['pitching', 'funding'],
    registrationDeadline: at(3, 23),
  }),
  e('buea-church-biz', {
    title: 'Church entrepreneurship conference',
    city: 'Buea',
    startsAt: at(20, 9),
    topics: ['business', 'community'],
    offers: ['learning', 'networking'],
  }),
  e('yaounde-ai', {
    title: 'AI summit Yaoundé',
    city: 'Yaoundé',
    startsAt: at(6, 9),
    topics: ['technology'],
    offers: ['learning', 'networking'],
  }),
  e('online-data', {
    title: 'Data science webinar',
    format: 'virtual',
    startsAt: at(4, 15),
    topics: ['technology', 'learning'],
    offers: ['learning'],
  }),
  e('bamenda-cocoa', {
    title: 'Cocoa drying training',
    city: 'Bamenda',
    startsAt: at(10, 8),
    topics: ['agriculture'],
    offers: ['learning'],
  }),
  e('online-agri-grant', {
    title: 'Agri-innovation grant information session',
    format: 'virtual',
    startsAt: at(14, 15),
    topics: ['agriculture', 'finance'],
    offers: ['funding'],
    registrationDeadline: at(2, 23),
  }),
  e('bamenda-poultry', {
    title: 'Poultry farming cooperative day',
    city: 'Bamenda',
    startsAt: at(25, 9),
    topics: ['agriculture', 'community'],
    offers: ['networking'],
  }),
  e('douala-finance', {
    title: 'Women in finance evening',
    city: 'Douala',
    startsAt: at(2, 18),
    topics: ['finance'],
    offers: ['networking'],
    verificationState: 'organizer_confirmed',
  }),
  e('douala-stale', {
    title: 'Accounting refresher',
    city: 'Douala',
    startsAt: at(2, 18),
    topics: ['finance'],
    offers: ['networking'],
    lastCheckedAt: checkedDaysAgo(60),
  }),
  e('douala-hybrid-marketing', {
    title: 'Digital marketing masterclass',
    format: 'hybrid',
    city: 'Douala',
    startsAt: at(7, 10),
    topics: ['business', 'creative_media'],
    offers: ['learning'],
  }),
  e('past-workshop', {
    title: 'Last week workshop',
    city: 'Buea',
    startsAt: at(-3, 9),
    topics: ['technology'],
    offers: ['learning'],
  }),
  e('cancelled-meetup', {
    title: 'Cancelled tech meetup',
    city: 'Buea',
    startsAt: at(6, 18),
    topics: ['technology'],
    offers: ['networking'],
    status: 'cancelled',
  }),
];
