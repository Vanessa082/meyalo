import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import type { EventCardData } from '../types/event.type.ts';
import { rankEventForUser, rankEventsList } from './ranking.service.ts';

function event(overrides: Partial<EventCardData>): EventCardData {
  return {
    id: 'evt',
    slug: 'evt',
    title: 'Event',
    organizerName: 'Organizer',
    eventType: 'Technology',
    primaryCategory: 'Technology',
    startsAt: '2026-10-15T09:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    priceType: 'unknown',
    status: 'scheduled',
    ...overrides,
  };
}

const events: EventCardData[] = [
  event({
    id: 'evt-1',
    slug: 'silicon-mountain-ai',
    title: 'Silicon Mountain AI Summit',
    organizerName: 'Tech Hub Buea',
    eventType: 'Technology',
    primaryCategory: 'Technology & Software',
    format: 'in_person',
    city: 'Buea',
    lastCheckedAt: '2026-09-01T08:00:00Z',
  }),
  event({
    id: 'evt-2',
    slug: 'douala-sme-finance',
    title: 'Central Africa SME Finance Forum',
    organizerName: 'Douala Commerce Guild',
    eventType: 'Finance',
    primaryCategory: 'Finance & Business',
    startsAt: '2026-11-05T10:00:00Z',
    format: 'in_person',
    city: 'Douala',
    lastCheckedAt: '2026-09-01T08:00:00Z',
  }),
  event({
    id: 'evt-3',
    slug: 'global-dev-webinar',
    title: 'Global React Native & Expo Masterclass',
    organizerName: 'Global Dev Community',
    eventType: 'Technology',
    primaryCategory: 'Technology & Software',
    startsAt: '2026-09-20T17:00:00Z',
    format: 'virtual',
    lastCheckedAt: '2026-09-01T08:00:00Z',
  }),
];

const profileDouala: LocalDiscoveryProfile = {
  schemaVersion: 1,
  onboardingCompletedAt: '2026-09-01T10:00:00Z',
  location: { cityId: 'douala', cityName: 'Douala', mode: 'manual' },
  formats: ['in_person', 'virtual'],
  interestIds: ['finance', 'business'],
  goalIds: ['grow_business'],
  locale: 'en',
};

const profileBueaPhysical: LocalDiscoveryProfile = {
  schemaVersion: 1,
  onboardingCompletedAt: '2026-09-01T10:00:00Z',
  location: { cityId: 'buea', cityName: 'Buea', mode: 'manual' },
  formats: ['in_person'],
  interestIds: ['technology'],
  goalIds: ['learn_skills'],
  locale: 'en',
};

describe('rankEventsList', () => {
  it('ranks the Douala finance event first for a Douala finance profile', () => {
    const ranked = rankEventsList(events, profileDouala);
    assert.equal(ranked[0]?.id, 'evt-2');
    assert.match(ranked[0]?.relevanceReasons?.[0] ?? '', /Why this fits:/);
  });

  it('excludes virtual events when the profile is physical only', () => {
    const ranked = rankEventsList(events, profileBueaPhysical);
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0]?.id, 'evt-1');
    assert.equal(
      ranked.some((item) => item.format === 'virtual'),
      false,
    );
  });

  it('does not exclude a virtual event because of city', () => {
    const ranked = rankEventForUser(events[2] as EventCardData, profileDouala);
    assert.ok(ranked.score > 0);
  });
});
