import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createLocalizer } from '../i18n/translate.ts';
import type { EventCardData } from '../types/event.type.ts';
import { DIGEST_MAX, weeklyDigest } from './weekly-digest.ts';

const catalog = (language: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../i18n/messages/${language}.json`, import.meta.url),
      'utf8',
    ),
  );
const en = createLocalizer({ en: catalog('en'), fr: catalog('fr') }, 'en');
const fr = createLocalizer({ en: catalog('en'), fr: catalog('fr') }, 'fr');

// Monday 19 October 2026, 10:00 in Douala.
const NOW = new Date('2026-10-19T09:00:00Z');
const link = (id: string) => `https://meyalo.expo.app/event/${id}`;

function event(
  id: string,
  startsAt: string,
  overrides: Partial<EventCardData> = {},
): EventCardData {
  return {
    id,
    slug: id,
    title: `Event ${id}`,
    organizerName: 'Org',
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    startsAt,
    timezone: 'Africa/Douala',
    format: 'in_person',
    city: 'Douala',
    priceType: 'free',
    status: 'scheduled',
    topics: [],
    offers: [],
    languages: ['en'],
    ...overrides,
  };
}

describe('weekly digest', () => {
  it('lists the next 7 days by day, with time, place and link', () => {
    const text = weeklyDigest(
      [
        event('b', '2026-10-24T08:00:00Z'),
        event('a', '2026-10-21T16:30:00Z', {
          format: 'virtual',
          city: undefined,
        }),
        event('late', '2026-10-27T08:00:00Z'),
        event('past', '2026-10-18T08:00:00Z'),
      ],
      { now: NOW, i18n: en, linkFor: link, timeZone: 'Africa/Douala' },
    );
    assert.ok(
      text.indexOf('Event a') < text.indexOf('Event b'),
      'soonest first',
    );
    assert.ok(text.includes('Wednesday 21 October'));
    assert.ok(text.includes('17:30'), 'local time');
    assert.ok(text.includes('Online'));
    assert.ok(text.includes(link('b')));
    assert.equal(text.includes('Event late'), false, 'beyond 7 days');
    assert.equal(text.includes('Event past'), false, 'already over');
  });

  it('leaves out cancelled events', () => {
    const text = weeklyDigest(
      [event('x', '2026-10-21T08:00:00Z', { status: 'cancelled' })],
      { now: NOW, i18n: en, linkFor: link, timeZone: 'Africa/Douala' },
    );
    assert.equal(text.includes('Event x'), false);
  });

  it('is written in the chosen language', () => {
    const text = weeklyDigest([event('a', '2026-10-21T08:00:00Z')], {
      now: NOW,
      i18n: fr,
      linkFor: link,
      timeZone: 'Africa/Douala',
    });
    assert.ok(text.includes('mercredi 21 octobre'));
  });

  it('stays within the length a WhatsApp post allows', () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      event(`e${i}`, `2026-10-2${1 + (i % 5)}T08:00:00Z`, {
        title: 'x'.repeat(80),
      }),
    );
    const text = weeklyDigest(many, {
      now: NOW,
      i18n: en,
      linkFor: link,
      timeZone: 'Africa/Douala',
    });
    assert.ok(text.length <= DIGEST_MAX, String(text.length));
  });
});
