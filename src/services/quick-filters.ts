import { REGION } from '../config/region.ts';
import type { EventCardData } from '../types/event.type.ts';
import { DAY_MS, zonedDay } from './zoned-time.ts';

/**
 * For You quick chips (docs/product-decisions.md, Feature 5 spec). Pure, so the
 * rules are tested here and the screen only holds which chips are on.
 */
export type QuickFilter = 'weekend' | 'free' | 'online' | 'closingSoon';

/** Display order of the chips. */
export const QUICK_FILTERS: readonly QuickFilter[] = [
  'weekend',
  'free',
  'online',
  'closingSoon',
];

const CLOSING_SOON_MS = 7 * DAY_MS;

/** True when the event matches every chip that is on. */
export function matchesQuickFilters(
  event: EventCardData,
  filters: readonly QuickFilter[],
  now: Date,
): boolean {
  return filters.every((filter) => matches(event, filter, now));
}

function matches(
  event: EventCardData,
  filter: QuickFilter,
  now: Date,
): boolean {
  switch (filter) {
    case 'weekend':
      return isThisWeekend(event, now);
    case 'free':
      return (
        event.priceType === 'free' ||
        event.priceType === 'free_with_registration'
      );
    case 'online':
      return event.format === 'virtual' || event.format === 'hybrid';
    case 'closingSoon': {
      if (!event.registrationDeadline) return false;
      const left = Date.parse(event.registrationDeadline) - now.getTime();
      return left >= 0 && left <= CLOSING_SOON_MS;
    }
  }
}

/** The event's start date is the coming Saturday or Sunday, both read in the
 *  event's own timezone. */
function isThisWeekend(event: EventCardData, now: Date): boolean {
  const timeZone = event.timezone || REGION.timeZone;
  const today = zonedDay(now.toISOString(), timeZone);
  const day = zonedDay(event.startsAt, timeZone);
  if (today === null || day === null) return false;

  // weekday: 0 Sunday … 6 Saturday
  const saturday =
    today.weekday === 0
      ? today.date - DAY_MS
      : today.date + (6 - today.weekday) * DAY_MS;
  const sunday = saturday + DAY_MS;
  return day.date >= Math.max(today.date, saturday) && day.date <= sunday;
}
