import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import { buildShareText, whatsAppContactUrl, whatsAppUrl } from './share.ts';

function event(overrides: Partial<EventCardData> = {}): EventCardData {
  return {
    id: 'evt',
    slug: 'evt',
    title: 'Cocoa drying training',
    organizerName: 'Farmers Union',
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    startsAt: '2026-11-14T08:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    priceType: 'free',
    priceMin: null,
    priceMax: null,
    currency: null,
    status: 'scheduled',
    topics: [],
    offers: [],
    languages: ['fr'],
    city: 'Bamenda',
    venueName: 'Community Hall',
    ...overrides,
  };
}

const text = { dateText: 'Sat, 14 Nov · 9:00 AM', priceLabel: 'Free' };

const labels = {
  online: 'Online',
  venueTbc: 'Venue to be confirmed',
  via: 'Found on Meyalo',
};

describe('buildShareText', () => {
  it('gives title, date, place, price and the link, one per line', () => {
    assert.equal(
      buildShareText(event(), text, 'https://meyalo.app/event/evt', labels),
      [
        'Cocoa drying training',
        'Sat, 14 Nov · 9:00 AM',
        'Community Hall, Bamenda',
        'Free',
        'https://meyalo.app/event/evt',
        'Found on Meyalo',
      ].join('\n'),
    );
  });

  it('says online for virtual events and never invents a place', () => {
    const online = buildShareText(
      event({ format: 'virtual' }),
      text,
      null,
      labels,
    );
    assert.match(online, /^Online$/m);
    const unknown = buildShareText(
      event({ venueName: undefined, city: undefined }),
      text,
      null,
      labels,
    );
    assert.match(unknown, /^Venue to be confirmed$/m);
  });

  it('leaves out the link line when there is no public address', () => {
    const shared = buildShareText(event(), text, null, labels);
    assert.doesNotMatch(shared, /https?:/);
  });

  it('shares the date and price in the language it is given', () => {
    const shared = buildShareText(
      event(),
      { dateText: 'sam. 14 nov. · 09:00', priceLabel: 'Gratuit' },
      null,
      labels,
    );
    assert.match(shared, /^sam\. 14 nov\. · 09:00$/m);
    assert.match(shared, /^Gratuit$/m);
  });
});

describe('whatsAppUrl', () => {
  it('opens a WhatsApp chat picker with the text encoded', () => {
    assert.equal(
      whatsAppUrl('Hi & bye\nhttps://x.example/?a=1'),
      'https://wa.me/?text=Hi%20%26%20bye%0Ahttps%3A%2F%2Fx.example%2F%3Fa%3D1',
    );
  });
});

describe('WhatsApp contact', () => {
  it('opens a chat with the configured number and a ready message', () => {
    assert.equal(
      whatsAppContactUrl('237671492013', 'Hello Meyalo'),
      'https://wa.me/237671492013?text=Hello%20Meyalo',
    );
  });

  it('is unavailable without a number', () => {
    assert.equal(whatsAppContactUrl(undefined, 'Hello'), null);
  });
});
