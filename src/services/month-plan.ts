import type { EventCardData } from '../types/event.type.ts';
import { eventSpan } from './event-time.ts';
import { samePlace } from './geo.ts';
import { KEEP_AFTER_END_DAYS } from './saved-events-store.ts';
import { DAY_MS, zonedDay } from './zoned-time.ts';

/**
 * My Month (docs/product-decisions.md, "Spec: My Month and plan states").
 * Pure: the screen passes planned events, the month and the time, and renders
 * what comes back.
 */

export interface PlannedEvent {
  /** The live event when known, else the copy saved with the plan. */
  event: EventCardData;
  plan: 'saved' | 'going';
  registered: boolean;
  change: PlanChange;
}

export type PlanChange = 'cancelled' | 'changed' | null;

export type PlanWarning =
  | { kind: 'clash'; with: string }
  | { kind: 'travel'; with: string };

export type AgendaItem =
  | { kind: 'event'; planned: PlannedEvent; warnings: PlanWarning[] }
  | { kind: 'deadline'; planned: PlannedEvent }
  | { kind: 'free'; weekday: 'saturday' | 'sunday'; count: number };

export interface CalendarDay {
  /** YYYY-MM-DD in the region's timezone. */
  date: string;
  inMonth: boolean;
  isToday: boolean;
  /** Has a Going event or an open registration deadline. */
  marked: boolean;
}

export interface MonthPlan {
  weeks: CalendarDay[][];
  /** Days of the month that have something, soonest first. */
  days: { date: string; items: AgendaItem[] }[];
  /** Saved (not Going) and not ended, soonest first. */
  considering: PlannedEvent[];
  /** Ended in the last 90 days, most recent first. */
  past: PlannedEvent[];
}

const key = (dayMs: number) => new Date(dayMs).toISOString().slice(0, 10);

function dayOf(iso: string, timeZone: string): string | null {
  const day = zonedDay(iso, timeZone);
  return day ? key(day.date) : null;
}

/** Cancelled, or a different date or place than when it was planned. */
export function planChange(
  saved: EventCardData,
  live: EventCardData | undefined,
): PlanChange {
  if (!live) return null;
  if (live.status === 'cancelled') return 'cancelled';
  const moved =
    live.startsAt !== saved.startsAt ||
    (live.city ?? '') !== (saved.city ?? '') ||
    (live.venueName ?? '') !== (saved.venueName ?? '');
  return moved ? 'changed' : null;
}

export function buildMonthPlan(
  planned: readonly PlannedEvent[],
  month: { year: number; month: number },
  now: Date,
  timeZone: string,
  /** For You matches per day (YYYY-MM-DD), for the free-weekend rows. */
  matchesByDay: ReadonlyMap<string, number>,
): MonthPlan {
  const nowMs = now.getTime();
  const today = zonedDay(now.toISOString(), timeZone);
  const todayKey = today ? key(today.date) : '';
  const zoneOf = (event: EventCardData) => event.timezone || timeZone;

  const ended = (p: PlannedEvent) => eventSpan(p.event).end < nowMs;
  const upcoming = planned.filter((p) => !ended(p));
  const going = upcoming
    .filter((p) => p.plan === 'going')
    .sort((a, b) => eventSpan(a.event).start - eventSpan(b.event).start);

  // Month bounds as YYYY-MM-DD keys.
  const first = Date.UTC(month.year, month.month - 1, 1);
  const last = Date.UTC(month.year, month.month, 0);
  const inMonth = (date: string) => date >= key(first) && date <= key(last);

  const byDay = new Map<string, AgendaItem[]>();
  const add = (date: string, item: AgendaItem) =>
    byDay.set(date, [...(byDay.get(date) ?? []), item]);

  // Going events, with clashes and travel between events of the same day.
  const goingDays = new Set<string>();
  for (const p of going) {
    const date = dayOf(p.event.startsAt, zoneOf(p.event));
    if (!date) continue;
    goingDays.add(date);
    if (!inMonth(date)) continue;
    const mine = eventSpan(p.event);
    const warnings: PlanWarning[] = [];
    for (const other of going) {
      if (
        other === p ||
        dayOf(other.event.startsAt, zoneOf(other.event)) !== date
      ) {
        continue;
      }
      const theirs = eventSpan(other.event);
      if (mine.start < theirs.end && theirs.start < mine.end) {
        warnings.push({ kind: 'clash', with: other.event.title });
      } else if (
        p.event.format !== 'virtual' &&
        other.event.format !== 'virtual' &&
        p.event.city &&
        other.event.city &&
        !samePlace(p.event.city, other.event.city)
      ) {
        warnings.push({ kind: 'travel', with: other.event.title });
      }
    }
    add(date, { kind: 'event', planned: p, warnings });
  }

  // Open registration deadlines of Saved and Going events.
  for (const p of upcoming) {
    const deadline = p.event.registrationDeadline;
    if (p.registered || !deadline || Date.parse(deadline) < nowMs) continue;
    const date = dayOf(deadline, zoneOf(p.event));
    if (date && inMonth(date)) add(date, { kind: 'deadline', planned: p });
  }

  // Free days of the coming weekend.
  if (today) {
    const saturday =
      today.weekday === 0
        ? today.date - DAY_MS
        : today.date + (6 - today.weekday) * DAY_MS;
    for (const [dayMs, weekday] of [
      [saturday, 'saturday'],
      [saturday + DAY_MS, 'sunday'],
    ] as const) {
      const date = key(dayMs);
      const count = matchesByDay.get(date) ?? 0;
      if (
        dayMs >= today.date &&
        inMonth(date) &&
        !goingDays.has(date) &&
        count > 0
      ) {
        add(date, { kind: 'free', weekday, count });
      }
    }
  }

  const order = { event: 0, deadline: 1, free: 2 } as const;
  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      items: [...items].sort((a, b) => order[a.kind] - order[b.kind]),
    }));

  // Whole weeks, Monday first.
  const startOffset = (new Date(first).getUTCDay() + 6) % 7;
  const endOffset = 6 - ((new Date(last).getUTCDay() + 6) % 7);
  const marked = new Set(
    days
      .filter((d) => d.items.some((item) => item.kind !== 'free'))
      .map((d) => d.date),
  );
  const weeks: CalendarDay[][] = [];
  for (
    let day = first - startOffset * DAY_MS;
    day <= last + endOffset * DAY_MS;
    day += DAY_MS
  ) {
    if ((weeks.at(-1)?.length ?? 7) === 7) weeks.push([]);
    const date = key(day);
    weeks.at(-1)?.push({
      date,
      inMonth: inMonth(date),
      isToday: date === todayKey,
      marked: marked.has(date),
    });
  }

  return {
    weeks,
    days,
    considering: upcoming
      .filter((p) => p.plan === 'saved')
      .sort((a, b) => eventSpan(a.event).start - eventSpan(b.event).start),
    past: planned
      .filter(
        (p) =>
          ended(p) &&
          nowMs - eventSpan(p.event).end < KEEP_AFTER_END_DAYS * DAY_MS,
      )
      .sort((a, b) => eventSpan(b.event).start - eventSpan(a.event).start),
  };
}

/** How many events fall on each local day (YYYY-MM-DD). */
export function countEventsByDay(
  events: readonly EventCardData[],
  timeZone: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const date = dayOf(event.startsAt, event.timezone || timeZone);
    if (date) counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}
