import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import type { EventCardData } from '../types/event.type.ts';
import { buildForYouFeed, type ForYouFeed } from './ranking.service.ts';

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
    ...overrides,
  };
}

function profile(
  overrides: Partial<LocalDiscoveryProfile> = {},
): LocalDiscoveryProfile {
  return {
    schemaVersion: 2,
    onboardingCompletedAt: '2026-10-01T10:00:00Z',
    area: { kind: 'city', city: { id: 'buea', name: 'Buea' } },
    format: 'both',
    interestIds: ['technology'],
    goalIds: ['learn_skills'],
    updatedAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

/** Ids in the main list (top picks then more upcoming). */
function mainIds(feed: ForYouFeed): string[] {
  return [
    ...feed.topPicks.map((pick) => pick.event.id),
    ...feed.moreUpcoming.map((item) => item.id),
  ];
}

describe('buildForYouFeed: city is a hard rule', () => {
  it('never lists an in-person event from another city for a Buea profile', () => {
    const yaounde = event({
      id: 'yaounde',
      city: 'Yaoundé',
      topics: ['technology'],
    });
    const feed = buildForYouFeed([yaounde], profile(), NOW);
    assert.deepEqual(mainIds(feed), []);
  });

  it('suggests a matching other-city event under beyondCity, with distance', () => {
    const yaounde = event({
      id: 'yaounde',
      city: 'Yaoundé',
      topics: ['technology'],
      latitude: 3.8667,
      longitude: 11.5167,
    });
    const feed = buildForYouFeed([yaounde], profile(), NOW);
    assert.deepEqual(
      feed.beyondCity.map((item) => item.id),
      ['yaounde'],
    );
    assert.ok((feed.beyondCity[0]?.distanceKm ?? 0) > 200);
  });

  it('leaves non-matching other-city events out entirely', () => {
    const farming = event({
      id: 'farming',
      city: 'Bamenda',
      topics: ['agriculture'],
    });
    const feed = buildForYouFeed([farming], profile(), NOW);
    assert.deepEqual(mainIds(feed), []);
    assert.deepEqual(feed.beyondCity, []);
  });

  it('orders beyondCity nearest first', () => {
    const yaounde = event({
      id: 'yaounde',
      city: 'Yaoundé',
      topics: ['technology'],
      latitude: 3.8667,
      longitude: 11.5167,
    });
    const douala = event({
      id: 'douala',
      city: 'Douala',
      topics: ['technology'],
      latitude: 4.05,
      longitude: 9.7,
    });
    const feed = buildForYouFeed([yaounde, douala], profile(), NOW);
    assert.deepEqual(
      feed.beyondCity.map((item) => item.id),
      ['douala', 'yaounde'],
    );
  });

  it('matches the city regardless of accents and case', () => {
    const local = event({ id: 'local', city: 'BUEA', topics: ['technology'] });
    const feed = buildForYouFeed([local], profile(), NOW);
    assert.deepEqual(mainIds(feed), ['local']);
  });

  it('keeps online events from anywhere in the main list', () => {
    const online = event({ id: 'online', format: 'virtual' });
    const feed = buildForYouFeed([online], profile(), NOW);
    assert.deepEqual(mainIds(feed), ['online']);
  });

  it('puts a hybrid event from another city beyond the city, not in the main list', () => {
    const hybrid = event({
      id: 'hybrid',
      format: 'hybrid',
      city: 'Douala',
      topics: ['technology'],
    });
    const feed = buildForYouFeed([hybrid], profile(), NOW);
    assert.deepEqual(mainIds(feed), []);
    assert.deepEqual(
      feed.beyondCity.map((item) => item.id),
      ['hybrid'],
    );
  });

  it("keeps a hybrid event in the user's own city, or with no city, local", () => {
    const here = event({ id: 'here', format: 'hybrid', city: 'Buea' });
    const nowhere = event({ id: 'nowhere', format: 'hybrid', city: undefined });
    const feed = buildForYouFeed([here, nowhere], profile(), NOW);
    assert.deepEqual(mainIds(feed).sort(), ['here', 'nowhere']);
  });

  it('keeps hybrid events from anywhere for someone who only attends online', () => {
    const hybrid = event({ id: 'hybrid', format: 'hybrid', city: 'Douala' });
    const onlineOnly = buildForYouFeed(
      [hybrid],
      profile({ area: { kind: 'online_only' }, format: null }),
      NOW,
    );
    assert.deepEqual(mainIds(onlineOnly), ['hybrid']);
    const prefersOnline = buildForYouFeed(
      [hybrid],
      profile({ format: 'online' }),
      NOW,
    );
    assert.deepEqual(mainIds(prefersOnline), ['hybrid']);
  });
});

describe('buildForYouFeed: other hard rules', () => {
  it('excludes past, cancelled and completed events', () => {
    const past = event({
      id: 'past',
      city: 'Buea',
      startsAt: '2026-10-01T09:00:00Z',
    });
    const cancelled = event({
      id: 'cancelled',
      city: 'Buea',
      status: 'cancelled',
    });
    const completed = event({
      id: 'completed',
      city: 'Buea',
      status: 'completed',
    });
    const feed = buildForYouFeed([past, cancelled, completed], profile(), NOW);
    assert.deepEqual(mainIds(feed), []);
  });

  it('excludes online events for an in-person-only profile', () => {
    const online = event({
      id: 'online',
      format: 'virtual',
      topics: ['technology'],
    });
    const feed = buildForYouFeed(
      [online],
      profile({ format: 'in_person' }),
      NOW,
    );
    assert.deepEqual(mainIds(feed), []);
  });

  it('excludes in-person events, even in other cities, for online-only', () => {
    const inPerson = event({
      id: 'room',
      city: 'Douala',
      topics: ['technology'],
    });
    const feed = buildForYouFeed(
      [inPerson],
      profile({ area: { kind: 'online_only' }, format: null }),
      NOW,
    );
    assert.deepEqual(mainIds(feed), []);
    assert.deepEqual(feed.beyondCity, []);
  });
});

describe('buildForYouFeed: top picks', () => {
  it('picks events matching topics or goals by taxonomy id, with reasons', () => {
    const match = event({
      id: 'match',
      city: 'Buea',
      topics: ['technology'],
      offers: ['learning'],
    });
    const other = event({ id: 'other', city: 'Buea', topics: ['health'] });
    const feed = buildForYouFeed([match, other], profile(), NOW);
    assert.deepEqual(
      feed.topPicks.map((pick) => pick.event.id),
      ['match'],
    );
    assert.deepEqual(feed.topPicks[0]?.reasons, [
      { kind: 'topic', topicId: 'technology' },
      { kind: 'goal', goalId: 'learn_skills' },
    ]);
    assert.deepEqual(
      feed.moreUpcoming.map((item) => item.id),
      ['other'],
    );
  });

  it('does not match on words in the category (no substring matching)', () => {
    const misleading = event({
      id: 'misleading',
      city: 'Buea',
      primaryCategory: 'Technology & Software',
      topics: [],
    });
    const feed = buildForYouFeed([misleading], profile(), NOW);
    assert.deepEqual(feed.topPicks, []);
  });

  it('keeps at most one top pick per organizer', () => {
    const a = event({
      id: 'a',
      city: 'Buea',
      organizerName: 'Hub',
      topics: ['technology'],
    });
    const b = event({
      id: 'b',
      city: 'Buea',
      organizerName: 'Hub',
      topics: ['technology'],
    });
    const feed = buildForYouFeed([a, b], profile(), NOW);
    assert.equal(feed.topPicks.length, 1);
    assert.equal(feed.moreUpcoming.length, 1);
  });

  it('prefers sooner matches and marks events this week', () => {
    const soon = event({
      id: 'soon',
      city: 'Buea',
      organizerName: 'A',
      topics: ['technology'],
      startsAt: '2026-10-20T09:00:00Z',
    });
    const later = event({
      id: 'later',
      city: 'Buea',
      organizerName: 'B',
      topics: ['technology'],
      startsAt: '2026-11-30T09:00:00Z',
    });
    const feed = buildForYouFeed([later, soon], profile(), NOW);
    assert.equal(feed.topPicks[0]?.event.id, 'soon');
    assert.ok(feed.topPicks[0]?.reasons.some((r) => r.kind === 'soon'));
  });

  it('ignores goals that map to no offer', () => {
    const anything = event({ id: 'x', city: 'Buea', offers: ['learning'] });
    const feed = buildForYouFeed(
      [anything],
      profile({ interestIds: [], goalIds: ['stay_informed'] }),
      NOW,
    );
    assert.deepEqual(feed.topPicks, []);
  });
});

describe('buildForYouFeed: cold start', () => {
  it('lists everything eligible by date with no picks and no reasons', () => {
    const late = event({ id: 'late', startsAt: '2026-11-10T09:00:00Z' });
    const early = event({ id: 'early', startsAt: '2026-10-20T09:00:00Z' });
    const feed = buildForYouFeed([late, early], null, NOW);
    assert.equal(feed.personalized, false);
    assert.deepEqual(feed.topPicks, []);
    assert.deepEqual(
      feed.moreUpcoming.map((item) => item.id),
      ['early', 'late'],
    );
  });
});

describe('buildForYouFeed: hidden events and learned affinity', () => {
  const neutral = {
    score: () => 0,
    isTooFar: () => false,
    isHabit: () => false,
  };

  it('never shows a hidden event, personalized or not', () => {
    const events = [
      event({ id: 'hidden', topics: ['technology'], city: 'Buea' }),
      event({ id: 'kept', organizerName: 'Other', city: 'Buea' }),
    ];
    const hiddenIds = new Set(['hidden']);
    const feed = buildForYouFeed(events, profile(), NOW, { hiddenIds });
    assert.deepEqual(mainIds(feed), ['kept']);
    const cold = buildForYouFeed(events, null, NOW, { hiddenIds });
    assert.deepEqual(mainIds(cold), ['kept']);
  });

  it('hides from the other cities section too', () => {
    const yaounde = event({ id: 'y', city: 'Yaoundé', topics: ['technology'] });
    const feed = buildForYouFeed([yaounde], profile(), NOW, {
      hiddenIds: new Set(['y']),
    });
    assert.deepEqual(feed.beyondCity, []);
  });

  it('reorders matches by affinity without adding unmatched events', () => {
    const first = event({
      id: 'first',
      organizerName: 'A',
      city: 'Buea',
      topics: ['technology'],
      startsAt: '2026-10-27T09:00:00Z',
    });
    const second = event({
      id: 'second',
      organizerName: 'B',
      city: 'Buea',
      topics: ['technology'],
      startsAt: '2026-10-28T09:00:00Z',
    });
    const unmatched = event({
      id: 'unmatched',
      organizerName: 'C',
      city: 'Buea',
    });
    const affinity = {
      ...neutral,
      score: (e: EventCardData) => (e.organizerName === 'B' ? 1 : 0),
    };
    const feed = buildForYouFeed([first, second, unmatched], profile(), NOW, {
      affinity,
    });
    assert.deepEqual(
      feed.topPicks.map((pick) => pick.event.id),
      ['second', 'first'],
    );
    assert.deepEqual(
      feed.moreUpcoming.map((item) => item.id),
      ['unmatched'],
    );
  });

  it('puts a city marked too far last among other cities', () => {
    const douala = event({
      id: 'douala',
      city: 'Douala',
      topics: ['technology'],
      latitude: 4.05,
      longitude: 9.7,
    });
    const yaounde = event({
      id: 'yaounde',
      city: 'Yaoundé',
      topics: ['technology'],
      latitude: 3.87,
      longitude: 11.52,
    });
    const affinity = {
      ...neutral,
      isTooFar: (e: EventCardData) => e.city === 'Douala',
    };
    const feed = buildForYouFeed([douala, yaounde], profile(), NOW, {
      affinity,
    });
    assert.deepEqual(
      feed.beyondCity.map((item) => item.id),
      ['yaounde', 'douala'],
    );
  });
});

describe('buildForYouFeed: deadlines, freshness, mix and reasons', () => {
  const tech = (id: string, overrides: Partial<EventCardData> = {}) =>
    event({
      id,
      organizerName: `org-${id}`,
      city: 'Buea',
      topics: ['technology'],
      startsAt: '2026-10-28T09:00:00Z',
      ...overrides,
    });
  const picks = (feed: ForYouFeed) => feed.topPicks.map((p) => p.event.id);

  it('lifts a match whose registration closes within a week, and says so first', () => {
    const feed = buildForYouFeed(
      [
        tech('plain'),
        tech('closing', { registrationDeadline: '2026-10-21T22:00:00Z' }),
      ],
      profile(),
      NOW,
    );
    assert.deepEqual(picks(feed), ['closing', 'plain']);
    assert.deepEqual(feed.topPicks[0].reasons[0], { kind: 'deadline' });
  });

  it('does not make an unmatched event a pick because of its deadline', () => {
    const feed = buildForYouFeed(
      [
        tech('unmatched', {
          topics: ['agriculture'],
          registrationDeadline: '2026-10-21T22:00:00Z',
        }),
      ],
      profile({ goalIds: [] }),
      NOW,
    );
    assert.deepEqual(picks(feed), []);
  });

  it('prefers a recently checked event over one not checked for weeks', () => {
    const feed = buildForYouFeed(
      [
        tech('stale', { lastCheckedAt: '2026-08-20T09:00:00Z' }),
        tech('fresh', { lastCheckedAt: '2026-10-16T09:00:00Z' }),
      ],
      profile(),
      NOW,
    );
    assert.deepEqual(picks(feed), ['fresh', 'stale']);
  });

  it('keeps at most two top picks on one topic', () => {
    const feed = buildForYouFeed(
      [
        tech('t1'),
        tech('t2'),
        tech('t3'),
        tech('t4'),
        tech('b1', {
          topics: ['business'],
          startsAt: '2026-11-12T09:00:00Z',
        }),
      ],
      profile({ interestIds: ['technology', 'business'] }),
      NOW,
    );
    const ids = picks(feed);
    assert.equal(ids.filter((id) => id.startsWith('t')).length, 2);
    assert.ok(ids.includes('b1'));
  });

  it('adds "like events you saved" when habits lifted a match', () => {
    const feed = buildForYouFeed([tech('a')], profile(), NOW, {
      affinity: {
        score: () => 0.5,
        isTooFar: () => false,
        isHabit: () => true,
      },
    });
    assert.ok(
      feed.topPicks[0].reasons.some((reason) => reason.kind === 'habit'),
    );
  });
});

describe('buildForYouFeed: which reasons survive the limit of three', () => {
  it('keeps deadline and habit ahead of extra topics and timing', () => {
    const feed = buildForYouFeed(
      [
        event({
          id: 'a',
          city: 'Buea',
          topics: ['technology', 'business', 'finance'],
          startsAt: '2026-10-20T09:00:00Z',
          registrationDeadline: '2026-10-19T22:00:00Z',
        }),
      ],
      profile({
        interestIds: ['technology', 'business', 'finance'],
        goalIds: [],
      }),
      NOW,
      {
        affinity: {
          score: () => 0.5,
          isTooFar: () => false,
          isHabit: () => true,
        },
      },
    );
    const kinds = feed.topPicks[0].reasons.map((r) => r.kind);
    assert.deepEqual(kinds, ['deadline', 'habit', 'topic']);
  });
});
