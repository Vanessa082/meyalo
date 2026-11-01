import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import { type AffinitySignals, buildAffinity } from './affinity.ts';
import type { HiddenEntry, HiddenSnapshot } from './hidden-events-store.ts';

function event(overrides: Partial<EventCardData> = {}): EventCardData {
  return {
    id: 'evt',
    slug: 'evt',
    title: 'Event',
    organizerName: 'Hub',
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    // Wednesday 21 October 2026, 18:00 in Douala: weekday evening.
    startsAt: '2026-10-21T17:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    city: 'Buea',
    priceType: 'free',
    priceMin: null,
    priceMax: null,
    currency: null,
    status: 'scheduled',
    topics: ['technology'],
    offers: [],
    languages: ['en'],
    ...overrides,
  };
}

function hidden(
  reason: HiddenEntry['reason'],
  snapshot: Partial<HiddenSnapshot> = {},
  id = 'hidden',
): HiddenEntry {
  return {
    id,
    hiddenAt: '2026-10-19T09:00:00Z',
    reason,
    snapshot: {
      title: 'Hidden',
      startsAt: '2026-10-21T17:00:00Z',
      timezone: 'Africa/Douala',
      organizerName: 'Hub',
      topics: ['technology'],
      priceType: 'free',
      format: 'in_person',
      city: 'Buea',
      ...snapshot,
    },
  };
}

function signals(overrides: Partial<AffinitySignals> = {}): AffinitySignals {
  return { saved: [], hidden: [], ...overrides };
}

describe('buildAffinity', () => {
  it('is neutral with no signals', () => {
    const affinity = buildAffinity(signals());
    assert.equal(affinity.score(event()), 0);
  });

  it('raises events that share a topic or organiser with a save', () => {
    const affinity = buildAffinity(
      signals({
        saved: [{ topics: ['technology'], organizerName: 'Other' }],
      }),
    );
    assert.ok(affinity.score(event()) > 0);
    assert.equal(affinity.score(event({ topics: ['agriculture'] })), 0);
  });

  it('a hide without a reason changes nothing else', () => {
    const affinity = buildAffinity(signals({ hidden: [hidden(null)] }));
    assert.equal(affinity.score(event()), 0);
  });

  it('"not my topic" lowers the topic and the organiser', () => {
    const affinity = buildAffinity(
      signals({ hidden: [hidden('not_my_topic')] }),
    );
    assert.ok(affinity.score(event({ organizerName: 'Elsewhere' })) < 0);
    assert.ok(affinity.score(event({ topics: ['agriculture'] })) < 0);
    assert.equal(
      affinity.score(event({ topics: ['agriculture'], organizerName: 'X' })),
      0,
    );
  });

  it('"too expensive" lowers paid events only', () => {
    const affinity = buildAffinity(
      signals({ hidden: [hidden('too_expensive', { priceType: 'paid' })] }),
    );
    assert.ok(affinity.score(event({ priceType: 'paid' })) < 0);
    assert.equal(affinity.score(event({ priceType: 'free' })), 0);
  });

  it('"wrong time" lowers the same part of the week and day', () => {
    const affinity = buildAffinity(signals({ hidden: [hidden('wrong_time')] }));
    // Thursday 19:00 Douala: also a weekday evening.
    assert.ok(affinity.score(event({ startsAt: '2026-10-22T18:00:00Z' })) < 0);
    // Wednesday 09:00 Douala: weekday morning.
    assert.equal(
      affinity.score(event({ startsAt: '2026-10-21T08:00:00Z' })),
      0,
    );
    // Saturday 18:00 Douala: weekend evening.
    assert.equal(
      affinity.score(event({ startsAt: '2026-10-24T17:00:00Z' })),
      0,
    );
  });

  it('"too far" marks the city, for in-person events only', () => {
    const affinity = buildAffinity(
      signals({ hidden: [hidden('too_far', { city: 'Yaoundé' })] }),
    );
    assert.equal(affinity.isTooFar(event({ city: 'Yaounde' })), true);
    assert.equal(
      affinity.isTooFar(event({ city: 'Yaoundé', format: 'virtual' })),
      false,
    );
    assert.equal(affinity.isTooFar(event()), false);
    assert.ok(affinity.score(event({ city: 'Yaoundé' })) < 0);
  });

  it('stays within -1 and 1 however many signals pile up', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      hidden('not_my_topic', { topics: ['technology', 'business'] }, `h${i}`),
    );
    const affinity = buildAffinity(
      signals({
        hidden: [
          ...many,
          hidden('too_expensive', { priceType: 'paid' }, 'p'),
          hidden('wrong_time', {}, 't'),
        ],
      }),
    );
    const score = affinity.score(
      event({ topics: ['technology', 'business'], priceType: 'paid' }),
    );
    assert.equal(score, -1);

    const saves = Array.from({ length: 20 }, () => ({
      topics: ['technology'],
      organizerName: 'Hub',
    }));
    assert.equal(buildAffinity(signals({ saved: saves })).score(event()), 1);
  });

  it('a save and a "not my topic" on the same topic cancel out', () => {
    const affinity = buildAffinity(
      signals({
        saved: [{ topics: ['technology'], organizerName: 'A' }],
        hidden: [hidden('not_my_topic', { organizerName: 'B' })],
      }),
    );
    assert.equal(affinity.score(event({ organizerName: 'C' })), 0);
  });
});

describe('buildAffinity: habits', () => {
  const other = (overrides: Partial<EventCardData> = {}) =>
    event({ organizerName: 'Elsewhere', ...overrides });

  it('counts Going more than Saved, and an open less than a save', () => {
    const going = buildAffinity(
      signals({
        saved: [{ topics: ['technology'], organizerName: 'A', plan: 'going' }],
      }),
    ).score(other());
    const saved = buildAffinity(
      signals({
        saved: [{ topics: ['technology'], organizerName: 'A', plan: 'saved' }],
      }),
    ).score(other());
    const opened = buildAffinity(
      signals({
        opened: [
          {
            id: 'o',
            openedAt: '2026-10-19T09:00:00Z',
            topics: ['technology'],
            organizerName: 'A',
            startsAt: '2026-10-24T08:00:00Z',
            timezone: 'Africa/Douala',
          },
        ],
      }),
    ).score(other({ startsAt: '2026-10-21T17:00:00Z' }));
    assert.ok(going > saved, `${going} > ${saved}`);
    assert.ok(opened > 0 && opened < saved, `0 < ${opened} < ${saved}`);
  });

  it('lets recent behaviour lead: a save from 120 days ago counts a quarter', () => {
    const now = new Date('2026-10-19T09:00:00Z');
    const score = (savedAt: string) =>
      buildAffinity(
        signals({
          now,
          saved: [{ topics: ['technology'], organizerName: 'A', savedAt }],
        }),
      ).score(other());
    const fresh = score('2026-10-19T08:00:00Z');
    const old = score('2026-06-21T09:00:00Z');
    assert.ok(Math.abs(old - fresh / 4) < 0.01, `${old} vs ${fresh / 4}`);
  });

  it('lifts events at the times the person usually goes', () => {
    const affinity = buildAffinity(
      signals({
        saved: [
          {
            topics: ['agriculture'],
            organizerName: 'Farm',
            plan: 'going',
            // Wednesday 18:00 in Douala: a weekday evening.
            startsAt: '2026-10-21T17:00:00Z',
            timezone: 'Africa/Douala',
          },
        ],
      }),
    );
    const eveningElsewhere = other({
      topics: ['health'],
      startsAt: '2026-10-22T18:00:00Z',
    });
    const weekendMorning = other({
      topics: ['health'],
      startsAt: '2026-10-24T08:00:00Z',
    });
    assert.ok(affinity.score(eveningElsewhere) > 0);
    assert.equal(affinity.score(weekendMorning), 0);
  });

  it('says when habits, not only the profile, lifted an event', () => {
    const affinity = buildAffinity(
      signals({
        saved: [
          { topics: ['technology'], organizerName: 'A', plan: 'going' },
          { topics: ['technology'], organizerName: 'B' },
        ],
      }),
    );
    assert.equal(affinity.isHabit(other()), true);
    assert.equal(affinity.isHabit(other({ topics: ['health'] })), false);
  });
});

describe('buildAffinity: after the event', () => {
  const now = new Date('2026-11-20T09:00:00Z');
  const other = () => event({ organizerName: 'Elsewhere' });
  const went = (overrides: Partial<AffinitySignals['saved'][number]>) =>
    buildAffinity(
      signals({
        now,
        saved: [
          {
            topics: ['technology'],
            organizerName: 'A',
            plan: 'going',
            savedAt: '2026-11-10T09:00:00Z',
            // Ended 10 Nov, 10 days before `now`.
            startsAt: '2026-11-10T08:00:00Z',
            timezone: 'Africa/Douala',
            ...overrides,
          },
        ],
      }),
    ).score(other());

  it('"I went" counts more than Going', () => {
    const yes = went({ attended: true, attendedAt: '2026-11-11T09:00:00Z' });
    const going = went({});
    assert.ok(yes > going, `${yes} > ${going}`);
  });

  it('"I did not go" is neutral: the interest shown by Going stays', () => {
    assert.equal(
      went({ attended: false, attendedAt: '2026-11-11T09:00:00Z' }),
      went({}),
    );
  });

  it('an unanswered Going counts for nothing 14 days after the event', () => {
    const stale = went({
      savedAt: '2026-10-30T09:00:00Z',
      startsAt: '2026-11-01T08:00:00Z',
    });
    assert.equal(stale, 0);
  });
});
