import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import {
  buildMonthPlan,
  countEventsByDay,
  type PlannedEvent,
  planChange,
} from './month-plan.ts';

// Monday 19 October 2026, 10:00 in Douala.
const NOW = new Date('2026-10-19T09:00:00Z');
const ZONE = 'Africa/Douala';
const OCTOBER = { year: 2026, month: 10 };

function event(
  id: string,
  overrides: Partial<EventCardData> = {},
): EventCardData {
  return {
    id,
    slug: id,
    title: `Event ${id}`,
    organizerName: 'Org',
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    startsAt: '2026-10-28T09:00:00Z',
    timezone: ZONE,
    format: 'in_person',
    city: 'Douala',
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

function planned(
  e: EventCardData,
  plan: 'saved' | 'going' = 'going',
  extra: Partial<PlannedEvent> = {},
): PlannedEvent {
  return { event: e, plan, registered: false, change: null, ...extra };
}

const build = (entries: PlannedEvent[], counts = new Map<string, number>()) =>
  buildMonthPlan(entries, OCTOBER, NOW, ZONE, counts);

describe('buildMonthPlan: calendar', () => {
  it('lays out whole weeks from Monday, marking today and planned days', () => {
    const plan = build([planned(event('a'))]);
    assert.equal(plan.weeks[0][0].date, '2026-09-28');
    assert.equal(plan.weeks.at(-1)?.at(-1)?.date, '2026-11-01');
    const days = plan.weeks.flat();
    assert.equal(days.find((d) => d.date === '2026-10-19')?.isToday, true);
    assert.equal(days.find((d) => d.date === '2026-10-28')?.marked, true);
    assert.equal(days.find((d) => d.date === '2026-10-27')?.marked, false);
    assert.equal(days.find((d) => d.date === '2026-09-28')?.inMonth, false);
  });
});

describe('buildMonthPlan: agenda', () => {
  it('lists Going events on their local day; Saved ones under Considering', () => {
    const plan = build([
      planned(event('going')),
      planned(event('saved', { startsAt: '2026-10-30T09:00:00Z' }), 'saved'),
    ]);
    assert.deepEqual(
      plan.days.map((d) => [d.date, d.items.map((i) => i.kind)]),
      [['2026-10-28', ['event']]],
    );
    assert.deepEqual(
      plan.considering.map((p) => p.event.id),
      ['saved'],
    );
  });

  it('adds open registration deadlines, until ticked registered', () => {
    const deadline = '2026-10-24T22:00:00Z'; // 24 Oct 23:00 in Douala
    const open = build([
      planned(event('a', { registrationDeadline: deadline }), 'saved'),
    ]);
    assert.deepEqual(
      open.days.map((d) => [d.date, d.items.map((i) => i.kind)]),
      [['2026-10-24', ['deadline']]],
    );
    const done = build([
      planned(event('a', { registrationDeadline: deadline }), 'saved', {
        registered: true,
      }),
    ]);
    assert.deepEqual(done.days, []);
  });

  it('flags Going events whose times overlap; no end counts as 2 hours', () => {
    const plan = build([
      planned(event('a', { startsAt: '2026-10-28T09:00:00Z' })),
      planned(event('b', { startsAt: '2026-10-28T10:30:00Z' })),
      planned(event('c', { startsAt: '2026-10-28T15:00:00Z' })),
    ]);
    const items = plan.days[0].items.filter((i) => i.kind === 'event');
    const warnings = Object.fromEntries(
      items.map((i) => [
        i.kind === 'event' && i.planned.event.id,
        i.kind === 'event' && i.warnings,
      ]),
    );
    assert.deepEqual(warnings.a, [{ kind: 'clash', with: 'Event b' }]);
    assert.deepEqual(warnings.b, [{ kind: 'clash', with: 'Event a' }]);
    assert.deepEqual(warnings.c, []);
  });

  it('warns about two cities the same day when times do not overlap', () => {
    const plan = build([
      planned(event('a', { startsAt: '2026-10-28T07:00:00Z', city: 'Douala' })),
      planned(
        event('b', { startsAt: '2026-10-28T15:00:00Z', city: 'Yaoundé' }),
      ),
    ]);
    const first = plan.days[0].items[0];
    assert.ok(first.kind === 'event');
    assert.deepEqual(first.warnings, [{ kind: 'travel', with: 'Event b' }]);
  });

  it('offers each free day of the coming weekend with its matches', () => {
    const counts = new Map([
      ['2026-10-24', 3],
      ['2026-10-25', 2],
    ]);
    const plan = build(
      [planned(event('sun', { startsAt: '2026-10-25T09:00:00Z' }))],
      counts,
    );
    const saturday = plan.days.find((d) => d.date === '2026-10-24');
    assert.deepEqual(saturday?.items, [
      { kind: 'free', weekday: 'saturday', count: 3 },
    ]);
    const sunday = plan.days.find((d) => d.date === '2026-10-25');
    assert.ok(sunday?.items.every((i) => i.kind !== 'free'));
  });

  it('moves ended events to Past', () => {
    const plan = build([
      planned(event('old', { startsAt: '2026-10-10T09:00:00Z' })),
      planned(event('later')),
    ]);
    assert.deepEqual(
      plan.past.map((p) => p.event.id),
      ['old'],
    );
    assert.ok(
      plan.days.every((d) =>
        d.items.every(
          (i) => i.kind !== 'event' || i.planned.event.id !== 'old',
        ),
      ),
    );
  });

  it('keeps Past to the last 90 days', () => {
    const plan = build([
      planned(event('recent', { startsAt: '2026-08-01T09:00:00Z' })),
      planned(event('ancient', { startsAt: '2026-07-01T09:00:00Z' })),
    ]);
    assert.deepEqual(
      plan.past.map((p) => p.event.id),
      ['recent'],
    );
  });
});

describe('planChange', () => {
  it('reports cancelled, a new date or place, or nothing', () => {
    const saved = event('a');
    assert.equal(planChange(saved, saved), null);
    assert.equal(planChange(saved, undefined), null);
    assert.equal(
      planChange(saved, { ...saved, status: 'cancelled' }),
      'cancelled',
    );
    assert.equal(
      planChange(saved, { ...saved, startsAt: '2026-10-29T09:00:00Z' }),
      'changed',
    );
    assert.equal(planChange(saved, { ...saved, city: 'Buea' }), 'changed');
  });
});

describe('countEventsByDay', () => {
  it('counts events per local day', () => {
    const counts = countEventsByDay(
      [
        event('a', { startsAt: '2026-10-24T09:00:00Z' }),
        event('b', { startsAt: '2026-10-24T23:30:00Z' }), // 25 Oct in Douala
        event('c', { startsAt: '2026-10-24T15:00:00Z' }),
      ],
      ZONE,
    );
    assert.equal(counts.get('2026-10-24'), 2);
    assert.equal(counts.get('2026-10-25'), 1);
  });
});
