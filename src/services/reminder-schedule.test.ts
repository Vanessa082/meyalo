import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import {
  MAX_REMINDERS,
  type PlannedForReminders,
  reminderSchedule,
} from './reminder-schedule.ts';

const ZONE = 'Africa/Douala'; // UTC+1, no daylight saving
const NOW = new Date('2026-11-01T10:00:00Z');

function event(overrides: Partial<EventCardData> = {}): EventCardData {
  return {
    id: 'e1',
    slug: 'e1',
    title: 'DevFest Douala',
    organizerName: 'GDG',
    eventType: 'Conference',
    primaryCategory: 'Conference',
    // 09:30 in Douala.
    startsAt: '2026-11-28T08:30:00Z',
    timezone: ZONE,
    format: 'in_person',
    priceType: 'free',
    status: 'scheduled',
    topics: [],
    offers: [],
    languages: ['en'],
    ...overrides,
  };
}

const going = (e: EventCardData, registered = false): PlannedForReminders => ({
  event: e,
  plan: 'going',
  registered,
});

const at = (list: { kind: string; at: string }[]) =>
  list.map((r) => `${r.kind} ${r.at}`);

describe('reminder schedule', () => {
  it('reminds Going events the evening before at 18:00 and 2 hours before', () => {
    assert.deepEqual(at(reminderSchedule([going(event())], NOW, ZONE)), [
      'evening_before 2026-11-27T17:00:00.000Z',
      'two_hours 2026-11-28T06:30:00.000Z',
      'how_was_it 2026-11-29T09:00:00.000Z',
    ]);
  });

  it('gives each reminder a stable id, so rescheduling replaces it', () => {
    const [first] = reminderSchedule([going(event())], NOW, ZONE);
    assert.equal(first?.id, 'e1:evening_before');
    assert.equal(first?.eventId, 'e1');
  });

  it('does not remind Saved events of the event itself', () => {
    assert.deepEqual(
      reminderSchedule(
        [{ event: event(), plan: 'saved', registered: false }],
        NOW,
        ZONE,
      ),
      [],
    );
  });

  it('reminds open deadlines 2 days before and that morning, Saved or Going', () => {
    // 23:59 in Douala on 20 Nov.
    const withDeadline = event({
      registrationDeadline: '2026-11-20T22:59:00Z',
    });
    const saved = reminderSchedule(
      [{ event: withDeadline, plan: 'saved', registered: false }],
      NOW,
      ZONE,
    );
    assert.deepEqual(at(saved), [
      'deadline_two_days 2026-11-18T22:59:00.000Z',
      'deadline_morning 2026-11-20T07:00:00.000Z',
    ]);
  });

  it('stops deadline reminders once registered', () => {
    const withDeadline = event({
      registrationDeadline: '2026-11-20T22:59:00Z',
    });
    assert.deepEqual(
      at(reminderSchedule([going(withDeadline, true)], NOW, ZONE)),
      [
        'evening_before 2026-11-27T17:00:00.000Z',
        'two_hours 2026-11-28T06:30:00.000Z',
        'how_was_it 2026-11-29T09:00:00.000Z',
      ],
    );
  });

  it('skips a morning reminder that would come after an early deadline', () => {
    // 07:00 in Douala: the 08:00 reminder would be too late.
    const early = event({ registrationDeadline: '2026-11-20T06:00:00Z' });
    assert.deepEqual(
      reminderSchedule(
        [{ event: early, plan: 'saved', registered: false }],
        NOW,
        ZONE,
      ).map((r) => r.kind),
      ['deadline_two_days'],
    );
  });

  it('schedules only future times', () => {
    // 2 hours before is 06:30Z; the evening before has passed.
    const now = new Date('2026-11-28T05:00:00Z');
    assert.deepEqual(
      reminderSchedule([going(event())], now, ZONE).map((r) => r.kind),
      ['two_hours', 'how_was_it'],
    );
  });

  it('never reminds cancelled events', () => {
    assert.deepEqual(
      reminderSchedule([going(event({ status: 'cancelled' }))], NOW, ZONE),
      [],
    );
  });

  it('uses the region timezone when the event has none', () => {
    assert.equal(
      reminderSchedule([going(event({ timezone: '' }))], NOW, ZONE)[0]?.at,
      '2026-11-27T17:00:00.000Z',
    );
  });

  it('keeps the soonest reminders within the phone limit', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      going(
        event({
          id: `e${i}`,
          startsAt: new Date(Date.UTC(2026, 10, 10 + i, 8, 30)).toISOString(),
        }),
      ),
    );
    const list = reminderSchedule(many.reverse(), NOW, ZONE);
    assert.equal(list.length, MAX_REMINDERS);
    const times = list.map((r) => Date.parse(r.at));
    assert.deepEqual(
      times,
      [...times].sort((a, b) => a - b),
    );
    assert.equal(list[0]?.eventId, 'e0');
  });

  it('asks "How was it?" at 10:00 the morning after the event ends', () => {
    // Two days, ending 29 Nov 17:00 in Douala.
    const twoDays = event({ endsAt: '2026-11-29T16:00:00Z' });
    assert.equal(
      reminderSchedule([going(twoDays)], NOW, ZONE).at(-1)?.at,
      '2026-11-30T09:00:00.000Z',
    );
  });

  it('does not ask once answered, or for Saved events', () => {
    const answered: PlannedForReminders = {
      ...going(event()),
      attended: true,
    };
    assert.deepEqual(
      reminderSchedule([answered], NOW, ZONE).map((r) => r.kind),
      ['evening_before', 'two_hours'],
    );
    assert.deepEqual(
      reminderSchedule(
        [{ event: event(), plan: 'saved', registered: false }],
        NOW,
        ZONE,
      ),
      [],
    );
  });
});
