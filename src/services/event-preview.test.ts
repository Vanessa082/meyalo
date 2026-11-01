import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import { previewMeta, toEventPreview } from './event-preview.ts';

function card(overrides: Partial<EventCardData> = {}): EventCardData {
  return {
    id: 'a1',
    slug: 'a1',
    title: 'Youth entrepreneurship day',
    organizerName: 'Diocese youth office',
    eventType: 'Conference',
    primaryCategory: 'Conference',
    startsAt: '2026-11-21T08:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    priceType: 'free',
    priceMin: null,
    priceMax: null,
    currency: null,
    status: 'scheduled',
    topics: ['business'],
    offers: [],
    languages: ['en'],
    city: 'Buea',
    venueName: 'Parish hall',
    description: `${'Pitch practice and mentoring. '.repeat(20)}`,
    ...overrides,
  };
}

const text = { dateText: 'Sat, 21 Nov · 9:00 AM', priceLabel: 'Free' };

describe('toEventPreview', () => {
  it('keeps what a link preview needs, with a short description', () => {
    const preview = toEventPreview(card(), text);
    assert.equal(preview.title, 'Youth entrepreneurship day');
    assert.equal(
      preview.details,
      'Sat, 21 Nov · 9:00 AM · Parish hall, Buea · Free',
    );
    assert.ok(preview.description.length <= 200);
    assert.ok(preview.description.endsWith('…'));
  });

  it('says online and drops unknown details instead of inventing them', () => {
    assert.equal(
      toEventPreview(card({ format: 'virtual' }), text).details,
      'Sat, 21 Nov · 9:00 AM · Online · Free',
    );
    assert.equal(
      toEventPreview(card({ venueName: undefined, city: undefined }), text)
        .details,
      'Sat, 21 Nov · 9:00 AM · Free',
    );
  });
});

describe('previewMeta', () => {
  const preview = toEventPreview(card(), text);

  it('builds Open Graph and Twitter tags with absolute URLs', () => {
    const meta = previewMeta(preview, 'https://meyalo.app');
    const byKey = Object.fromEntries(meta.map((tag) => [tag.key, tag.content]));
    assert.equal(byKey['og:title'], 'Youth entrepreneurship day');
    assert.equal(byKey['og:url'], 'https://meyalo.app/event/a1');
    assert.equal(byKey['og:image'], 'https://meyalo.app/og-default.png');
    assert.equal(byKey['og:site_name'], 'Meyalo');
    assert.equal(byKey['twitter:card'], 'summary_large_image');
    assert.match(byKey['og:description'] ?? '', /^Sat, 21 Nov/);
  });

  it('leaves out URL and image when no public address is configured', () => {
    const keys = previewMeta(preview, undefined).map((tag) => tag.key);
    assert.ok(!keys.includes('og:url'));
    assert.ok(!keys.includes('og:image'));
    assert.ok(keys.includes('og:title'));
  });
});
