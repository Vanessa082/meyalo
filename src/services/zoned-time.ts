/**
 * Wall-clock time in an IANA timezone <-> ISO instants, using Intl only.
 * Curators type the time printed on the event, in the event's timezone.
 */

const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/;

interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function parseWallTime(value: string): WallParts | null {
  const match = WALL_TIME.exec(value.trim());
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day, hour, minute };
}

function zoneParts(utcMs: number, timeZone: string): WallParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMs));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

function offsetMs(utcMs: number, timeZone: string): number {
  const minuteMs = utcMs - (utcMs % 60_000);
  const local = zoneParts(minuteMs, timeZone);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );
  return asUtc - minuteMs;
}

/** "2026-10-12 09:00" in Africa/Douala -> "2026-10-12T08:00:00.000Z". */
export function wallTimeToInstant(
  value: string,
  timeZone: string,
): string | null {
  const wall = parseWallTime(value);
  if (!wall || !isValidTimeZone(timeZone)) return null;
  const guess = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );
  let instant = guess - offsetMs(guess, timeZone);
  const corrected = guess - offsetMs(instant, timeZone);
  if (corrected !== instant) instant = corrected;
  return new Date(instant).toISOString();
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** ISO instant -> "YYYY-MM-DD HH:mm" in the given timezone. */
export function instantToWallTime(iso: string, timeZone: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms) || !isValidTimeZone(timeZone)) return '';
  const local = zoneParts(ms, timeZone);
  return `${local.year}-${pad(local.month)}-${pad(local.day)} ${pad(local.hour)}:${pad(local.minute)}`;
}

/** The calendar day, weekday and hour an instant falls on in a timezone.
 *  `date` is that day's midnight UTC, so days compare and step by DAY_MS. */
export function zonedDay(
  iso: string,
  timeZone: string,
): { date: number; weekday: number; hour: number } | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms) || !isValidTimeZone(timeZone)) return null;
  const local = zoneParts(ms, timeZone);
  const date = Date.UTC(local.year, local.month - 1, local.day);
  return { date, weekday: new Date(date).getUTCDay(), hour: local.hour };
}

/** One day in milliseconds, for durations (not calendar days in a zone). */
export const DAY_MS = 24 * 60 * 60 * 1000;
