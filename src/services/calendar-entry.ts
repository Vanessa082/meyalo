import type { EventCardData } from '../types/event.type.ts';

/**
 * What goes into the user's calendar for an event, and the same as an iCalendar
 * (.ics) file for the web (RFC 5545). Pure, so both are tested here.
 */
export interface CalendarEntry {
  /** Stable per event, so adding it twice updates rather than duplicates. */
  uid: string;
  title: string;
  /** ISO instants in UTC. */
  startDate: string;
  endDate: string;
  location: string;
  notes: string;
  url?: string;
}

export interface CalendarLabels {
  online: string;
  /** "Organised by <name>", already translated. */
  organizer: string;
  endNotStated: string;
  footer: string;
}

/** Calendars need an end; this one is used and labelled when none is stated. */
const ASSUMED_DURATION_MS = 2 * 60 * 60 * 1000;

export function toCalendarEntry(
  event: EventCardData,
  labels: CalendarLabels,
): CalendarEntry {
  const start = Date.parse(event.startsAt);
  const statedEnd = event.endsAt ? Date.parse(event.endsAt) : Number.NaN;
  const endKnown = Number.isFinite(statedEnd) && statedEnd > start;
  const end = endKnown ? statedEnd : start + ASSUMED_DURATION_MS;
  const url = event.registrationUrl ?? event.sourceUrl;

  const location =
    event.format === 'virtual'
      ? labels.online
      : [event.venueName, event.address, event.city]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(', ');

  const notes = [
    labels.organizer,
    endKnown ? null : labels.endNotStated,
    url ?? null,
    labels.footer,
  ].filter((line): line is string => Boolean(line));

  return {
    uid: `${event.id}@meyalo`,
    title: event.title,
    startDate: new Date(start).toISOString(),
    endDate: new Date(end).toISOString(),
    location,
    notes: notes.join('\n'),
    url,
  };
}

export function buildIcs(entry: CalendarEntry, now: Date): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meyalo//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${entry.uid}`,
    `DTSTAMP:${icsTime(now.toISOString())}`,
    `DTSTART:${icsTime(entry.startDate)}`,
    `DTEND:${icsTime(entry.endDate)}`,
    `SUMMARY:${escapeText(entry.title)}`,
    entry.location ? `LOCATION:${escapeText(entry.location)}` : null,
    `DESCRIPTION:${escapeText(entry.notes)}`,
    entry.url ? `URL:${entry.url}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => line !== null);
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** 2026-11-14T08:00:00.000Z -> 20261114T080000Z */
function icsTime(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, ';')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Lines over 75 bytes continue on the next line after a space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with a space, which counts toward the 75.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}
