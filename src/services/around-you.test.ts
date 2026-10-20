import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import type { EventCardData } from '../types/event.type.ts';
import { buildAroundYou } from './around-you.ts';

const NOW = new Date('2026-10-18T08:00:00Z');

function event(overrides: Partial<EventCardData>): EventCardData {
  return {
    id: 'evt',
    slug: 'evt',
    title: 'Event',
    organizerName: 'Organizer',
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    startsAt: '2026-10-28T09:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    priceType: 'unknown',
    status: 'scheduled',
    topics: [],
    offers: [],
    languages: ['en'],
    city: 'Buea',
    ...overrides,
  };
}

function inCity(id: string, name: string): LocalDiscoveryProfile {
  return {
    schemaVersion: 2,
    onboardingCompletedAt: null,
    area: { kind: 'city', city: { id, name } },
    format: null,
    interestIds: [],
    goalIds: [],
    updatedAt: '2026-10-01T10:00:00Z',
  };
}

const buea = inCity('buea', 'Buea');
// ~1.1 km and ~8.9 km north of the Buea centre (0.01° and 0.08° latitude).
const near = { latitude: 4.1767, longitude: 9.2333 };
const far = { latitude: 4.2467, longitude: 9.2333 };

describe('buildAroundYou', () => {
  it('asks for a city when none is chosen', () => {
    assert.deepEqual(buildAroundYou([], null, null, NOW), {
      kind: 'needs_city',
    });
  });

  it('says it is for in-person events when the profile is online only', () => {
    const profile = { ...buea, area: { kind: 'online_only' as const } };
    assert.equal(buildAroundYou([], profile, null, NOW).kind, 'online_only');
  });

  it('keeps only upcoming in-person and hybrid events in the city', () => {
    const result = buildAroundYou(
      [
        event({ id: 'room', ...near }),
        event({ id: 'hybrid', format: 'hybrid', ...near }),
        event({ id: 'online', format: 'virtual' }),
        event({ id: 'elsewhere', city: 'Douala', ...near }),
        event({ id: 'past', startsAt: '2026-10-01T09:00:00Z', ...near }),
      ],
      buea,
      null,
      NOW,
    );
    assert.equal(result.kind, 'city');
    if (result.kind !== 'city') return;
    assert.deepEqual(result.pinned.map((e) => e.id).sort(), ['hybrid', 'room']);
  });

  it('sorts nearest first and filters by radius', () => {
    const events = [
      event({ id: 'far', ...far }),
      event({ id: 'near', ...near }),
    ];
    const all = buildAroundYou(events, buea, null, NOW);
    const within5 = buildAroundYou(events, buea, 5, NOW);
    assert.ok(all.kind === 'city' && within5.kind === 'city');
    if (all.kind !== 'city' || within5.kind !== 'city') return;
    assert.deepEqual(
      all.pinned.map((e) => e.id),
      ['near', 'far'],
    );
    assert.deepEqual(
      within5.pinned.map((e) => e.id),
      ['near'],
    );
  });

  it('lists events without coordinates apart, never with a made-up distance', () => {
    const result = buildAroundYou([event({ id: 'nowhere' })], buea, 2, NOW);
    assert.ok(result.kind === 'city');
    if (result.kind !== 'city') return;
    assert.deepEqual(result.pinned, []);
    assert.deepEqual(
      result.unpinned.map((e) => e.id),
      ['nowhere'],
    );
    assert.equal(result.unpinned[0]?.distanceKm, undefined);
  });

  it('does not measure from a city with no known centre', () => {
    const kribi = inCity('kribi', 'Kribi');
    const result = buildAroundYou(
      [event({ id: 'k', city: 'Kribi', ...near })],
      kribi,
      null,
      NOW,
    );
    assert.ok(result.kind === 'city');
    if (result.kind !== 'city') return;
    assert.equal(result.measured, false);
    assert.deepEqual(
      result.unpinned.map((e) => e.id),
      ['k'],
    );
  });
});
