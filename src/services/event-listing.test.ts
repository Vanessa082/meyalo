import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import {
  buildRobots,
  buildSitemap,
  type ListingItem,
  toListingItem,
  upcomingByDay,
} from './event-listing.ts';

function event(overrides: Partial<EventCardData> = {}): EventCardData {
  return {
    id: 'e1',
    slug: 'e1',
    title: 'DevFest Yaoundé',
    organizerName: 'GDG',
    eventType: 'Conference',
    primaryCategory: 'Conference',
    startsAt: '2026-11-21T07:30:00Z',
    timezone: 'Africa/Douala',
    format: 'hybrid',
    city: 'Yaounde',
    priceType: 'free',
    status: 'scheduled',
    topics: [],
    offers: [],
    languages: ['en'],
    description: 'Long text that does not belong in a list.',
    ...overrides,
  };
}

describe('list items', () => {
  it('keeps what a list needs and matches the launch city', () => {
    assert.deepEqual(toListingItem(event()), {
      id: 'e1',
      title: 'DevFest Yaoundé',
      startsAt: '2026-11-21T07:30:00Z',
      endsAt: null,
      timezone: 'Africa/Douala',
      format: 'hybrid',
      city: 'Yaounde',
      cityId: 'yaounde',
      category: 'Conference',
    });
  });

  it('has no city id for online events or unknown places', () => {
    assert.equal(toListingItem(event({ format: 'virtual' })).cityId, null);
    assert.equal(toListingItem(event({ city: 'Atlantis' })).cityId, null);
  });
});

describe('upcoming by day', () => {
  const item = (
    id: string,
    startsAt: string,
    endsAt: string | null = null,
  ): ListingItem => ({
    ...toListingItem(event({ id, startsAt, endsAt: endsAt ?? undefined })),
  });

  it('drops events that have started and groups the rest by local day', () => {
    const now = new Date('2026-11-21T08:00:00Z');
    const days = upcomingByDay(
      [
        item('started', '2026-11-21T07:30:00Z'),
        item('later-today', '2026-11-21T15:00:00Z'),
        item('tomorrow', '2026-11-22T09:00:00Z'),
      ],
      now,
      'Africa/Douala',
    );
    assert.deepEqual(
      days.map((d) => [d.date, d.items.map((i) => i.id)]),
      [
        ['2026-11-21', ['later-today']],
        ['2026-11-22', ['tomorrow']],
      ],
    );
  });
});

describe('sitemap and robots', () => {
  const BASE = 'https://meyalo.expo.app';

  it('lists the public pages, each city list and each event', () => {
    const xml = buildSitemap(BASE, { cityIds: ['douala'], eventIds: ['e1'] });
    for (const path of [
      '/',
      '/events',
      '/events/douala',
      '/event/e1',
      '/how-we-verify',
      '/submit',
    ]) {
      assert.ok(xml.includes(`<loc>${BASE}${path}</loc>`), path);
    }
    assert.ok(xml.startsWith('<?xml'));
    assert.equal(xml.includes('/plan/'), false);
  });

  it('escapes what XML would misread', () => {
    assert.ok(
      buildSitemap(BASE, { cityIds: [], eventIds: ['a&b'] }).includes(
        'a&amp;b',
      ),
    );
  });

  it('keeps private pages out of search and points to the sitemap', () => {
    const robots = buildRobots(BASE);
    for (const path of [
      '/plan/',
      '/console',
      '/sign-in',
      '/verify',
      '/privacy-settings',
    ]) {
      assert.ok(robots.includes(`Disallow: ${path}`), path);
    }
    assert.ok(robots.includes(`Sitemap: ${BASE}/sitemap.xml`));
  });
});
