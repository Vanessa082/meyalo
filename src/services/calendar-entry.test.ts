import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import { buildIcs, toCalendarEntry } from './calendar-entry.ts';

function event(overrides: Partial<EventCardData> = {}): EventCardData {
  return {
    id: 'evt-1',
    slug: 'evt-1',
    title: 'Cocoa drying training',
    organizerName: 'Farmers Union',
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    startsAt: '2026-11-14T08:00:00Z',
    endsAt: '2026-11-14T12:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    venueName: 'Community Hall',
    address: 'Rue 12, Nkwen',
    city: 'Bamenda',
    priceType: 'free',
    priceMin: null,
    priceMax: null,
    currency: null,
    status: 'scheduled',
    topics: [],
    offers: [],
    languages: ['en'],
    registrationUrl: 'https://farmers.example/register',
    sourceUrl: 'https://farmers.example/events',
    ...overrides,
  };
}

const labels = {
  online: 'Online',
  organizer: 'Organised by Farmers Union',
  endNotStated: 'End time not stated',
  footer: 'Found on Meyalo',
};

describe('toCalendarEntry', () => {
  it('keeps the stated times, the place and the registration link', () => {
    const entry = toCalendarEntry(event(), labels);
    assert.equal(entry.uid, 'evt-1@meyalo');
    assert.equal(entry.title, 'Cocoa drying training');
    assert.equal(entry.startDate, '2026-11-14T08:00:00.000Z');
    assert.equal(entry.endDate, '2026-11-14T12:00:00.000Z');
    assert.equal(entry.location, 'Community Hall, Rue 12, Nkwen, Bamenda');
    assert.equal(entry.url, 'https://farmers.example/register');
    assert.equal(
      entry.notes,
      [
        'Organised by Farmers Union',
        'https://farmers.example/register',
        'Found on Meyalo',
      ].join('\n'),
    );
  });

  it('lasts 2 hours and says so when the end is not stated', () => {
    const entry = toCalendarEntry(event({ endsAt: undefined }), labels);
    assert.equal(entry.endDate, '2026-11-14T10:00:00.000Z');
    assert.match(entry.notes, /^End time not stated$/m);
  });

  it('ignores an end before the start rather than making a broken entry', () => {
    const entry = toCalendarEntry(
      event({ endsAt: '2026-11-14T07:00:00Z' }),
      labels,
    );
    assert.equal(entry.endDate, '2026-11-14T10:00:00.000Z');
    assert.match(entry.notes, /^End time not stated$/m);
  });

  it('uses Online as the place for online events', () => {
    const entry = toCalendarEntry(event({ format: 'virtual' }), labels);
    assert.equal(entry.location, 'Online');
  });

  it('falls back to the source link and leaves out an unknown place', () => {
    const entry = toCalendarEntry(
      event({
        registrationUrl: undefined,
        venueName: undefined,
        address: undefined,
        city: undefined,
      }),
      labels,
    );
    assert.equal(entry.url, 'https://farmers.example/events');
    assert.equal(entry.location, '');
  });
});

describe('buildIcs', () => {
  const now = new Date('2026-10-19T09:00:00Z');

  it('writes one VEVENT in UTC with CRLF line endings', () => {
    const ics = buildIcs(toCalendarEntry(event(), labels), now);
    const lines = ics.split('\r\n');
    assert.equal(lines[0], 'BEGIN:VCALENDAR');
    assert.ok(lines.includes('VERSION:2.0'));
    assert.ok(lines.includes('UID:evt-1@meyalo'));
    assert.ok(lines.includes('DTSTAMP:20261019T090000Z'));
    assert.ok(lines.includes('DTSTART:20261114T080000Z'));
    assert.ok(lines.includes('DTEND:20261114T120000Z'));
    assert.ok(lines.includes('SUMMARY:Cocoa drying training'));
    assert.ok(lines.includes('URL:https://farmers.example/register'));
    assert.equal(lines.at(-2), 'END:VCALENDAR');
    assert.equal(lines.at(-1), '');
    assert.doesNotMatch(ics, /[^\r]\n/);
  });

  it('escapes commas, semicolons, backslashes and newlines', () => {
    const ics = buildIcs(
      toCalendarEntry(event({ title: 'Q&A; part 1, \\ intro' }), labels),
      now,
    );
    assert.match(ics, /SUMMARY:Q&A; part 1\\, \\\\ intro\r\n/);
    assert.match(ics, /LOCATION:Community Hall\\, Rue 12\\, Nkwen\\, Bamenda/);
    assert.match(ics, /DESCRIPTION:Organised by Farmers Union\\nhttps:/);
  });

  it('folds lines longer than 75 bytes without splitting a character', () => {
    const title = 'Atelier é'.repeat(20);
    const ics = buildIcs(toCalendarEntry(event({ title }), labels), now);
    const physical = ics.split('\r\n');
    for (const line of physical) {
      assert.ok(Buffer.byteLength(line, 'utf8') <= 75, line);
    }
    const unfolded = ics.replace(/\r\n /g, '');
    assert.ok(unfolded.includes(`SUMMARY:${title}`));
  });
});
