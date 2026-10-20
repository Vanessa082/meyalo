import type { EventCardData } from '../types/event.type.ts';

/** As in the calendar export: an event without an end lasts 2 hours. */
export const ASSUMED_DURATION_MS = 2 * 60 * 60 * 1000;

/** Start and end in ms; the end is assumed when missing or not after start. */
export function eventSpan(event: Pick<EventCardData, 'startsAt' | 'endsAt'>): {
  start: number;
  end: number;
} {
  const start = Date.parse(event.startsAt);
  const stated = event.endsAt ? Date.parse(event.endsAt) : Number.NaN;
  return {
    start,
    end:
      Number.isFinite(stated) && stated > start
        ? stated
        : start + ASSUMED_DURATION_MS,
  };
}

export function hasEnded(
  event: Pick<EventCardData, 'startsAt' | 'endsAt'>,
  now: Date,
): boolean {
  return eventSpan(event).end < now.getTime();
}
