import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import { buildForYouLayout } from './for-you-rails.ts';

const NOW = new Date('2026-10-19T09:00:00Z');
const day = (n: number) =>
  new Date(NOW.getTime() + n * 86_400_000).toISOString();

function event(
  id: string,
  overrides: Partial<EventCardData> = {},
): EventCardData {
  return {
    id,
    slug: id,
    title: id,
    organizerName: `org-${id}`,
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    startsAt: day(10),
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
    ...overrides,
  };
}

const ids = (events: { id: string }[]) => events.map((e) => e.id);

describe('buildForYouLayout', () => {
  it('leads with the personal top picks', () => {
    const pick = event('pick');
    const layout = buildForYouLayout(
      { topPicks: [{ event: pick, reasons: [] }], moreUpcoming: [] },
      ['technology'],
      NOW,
    );
    assert.deepEqual(ids(layout.carousel.map((c) => c.event)), ['pick']);
  });

  it('with no picks, leads with what is on this week', () => {
    const soon = event('soon', { startsAt: day(2) });
    const later = event('later', { startsAt: day(20) });
    const layout = buildForYouLayout(
      { topPicks: [], moreUpcoming: [soon, later] },
      [],
      NOW,
    );
    assert.deepEqual(ids(layout.carousel.map((c) => c.event)), ['soon']);
    assert.deepEqual(ids(layout.rest), ['later']);
  });

  it('puts registrations closing within a week first in their own rail', () => {
    const closing = event('closing', { registrationDeadline: day(3) });
    const closingSooner = event('sooner', { registrationDeadline: day(1) });
    const open = event('open', { registrationDeadline: day(30) });
    const layout = buildForYouLayout(
      { topPicks: [], moreUpcoming: [closing, open, closingSooner] },
      [],
      NOW,
    );
    const rail = layout.rails.find((r) => r.kind === 'closing_soon');
    assert.ok(rail);
    assert.deepEqual(ids(rail.events), ['sooner', 'closing']);
  });

  it('makes a rail per interest with at least two events, never repeating one', () => {
    const t1 = event('t1', { topics: ['technology'] });
    const t2 = event('t2', { topics: ['technology', 'business'] });
    const b1 = event('b1', { topics: ['business'] });
    const b2 = event('b2', { topics: ['business'] });
    const lone = event('lone', { topics: ['health'] });
    const layout = buildForYouLayout(
      { topPicks: [], moreUpcoming: [t1, t2, b1, b2, lone] },
      ['technology', 'business', 'health'],
      NOW,
    );
    const topicRails = layout.rails.filter((r) => r.kind === 'topic');
    assert.deepEqual(
      topicRails.map((r) => [r.kind === 'topic' && r.topicId, ids(r.events)]),
      [
        ['technology', ['t1', 't2']],
        ['business', ['b1', 'b2']],
      ],
    );
    assert.deepEqual(ids(layout.rest), ['lone']);
  });

  it('without interests, uses the most common topics', () => {
    const events = ['a', 'b', 'c'].map((id) =>
      event(id, { topics: ['agriculture'] }),
    );
    const layout = buildForYouLayout(
      { topPicks: [], moreUpcoming: events },
      [],
      NOW,
    );
    const rail = layout.rails.find((r) => r.kind === 'topic');
    assert.ok(rail && rail.kind === 'topic');
    assert.equal(rail.topicId, 'agriculture');
  });

  it('shows every event exactly once across carousel, rails and the rest', () => {
    const events = Array.from({ length: 30 }, (_, i) =>
      event(`e${i}`, {
        startsAt: day(1 + (i % 15)),
        topics: [['technology', 'business', 'health'][i % 3]],
        registrationDeadline: i % 7 === 0 ? day(2) : undefined,
      }),
    );
    const layout = buildForYouLayout(
      { topPicks: [], moreUpcoming: events },
      ['technology', 'business'],
      NOW,
    );
    const shown = [
      ...layout.carousel.map((c) => c.event.id),
      ...layout.rails.flatMap((r) => ids(r.events)),
      ...ids(layout.rest),
    ];
    assert.equal(shown.length, 30);
    assert.equal(new Set(shown).size, 30);
    assert.ok(layout.rails.length <= 4);
    for (const rail of layout.rails) assert.ok(rail.events.length <= 8);
  });
});
