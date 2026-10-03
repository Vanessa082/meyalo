import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeEvent } from '../test-support/event-fixtures.ts';
import {
  buildDateBadge,
  buildPriceLabel,
  buildTrustLabel,
  buildVerificationText,
  formatEventDate,
  publicLinkLabel,
  toEventCard,
} from './event-mapping.ts';

const NO_PRICE = {
  priceType: 'unknown',
  priceMin: null,
  priceMax: null,
  currency: null,
} as const;

describe('buildTrustLabel', () => {
  it('names the verification state and does not say verified', () => {
    assert.equal(buildTrustLabel('source_confirmed'), 'Source confirmed');
    assert.equal(
      buildTrustLabel('organizer_confirmed'),
      'Confirmed by organizer',
    );
    assert.equal(buildTrustLabel('unreviewed'), 'Not reviewed');
  });
});

describe('buildVerificationText', () => {
  it('shows the check date for a recent confirmation and a warning when stale', () => {
    const now = new Date('2026-10-02T12:00:00.000Z');
    assert.equal(
      buildVerificationText(
        'source_confirmed',
        '2026-09-28T00:00:00.000Z',
        now,
      ),
      'Source confirmed · Checked 28 Sep 2026',
    );
    assert.equal(
      buildVerificationText(
        'source_confirmed',
        '2026-08-01T00:00:00.000Z',
        now,
      ),
      'Details may have changed — confirm at source',
    );
    assert.equal(
      buildVerificationText('unreviewed', '2026-10-01T00:00:00.000Z', now),
      'Not reviewed',
    );
  });
});

describe('buildPriceLabel', () => {
  it('keeps an explicit free price and does not invent one', () => {
    assert.equal(buildPriceLabel({ ...NO_PRICE, priceType: 'free' }), 'Free');
    assert.equal(buildPriceLabel(NO_PRICE), 'Price not stated');
    assert.equal(
      buildPriceLabel({
        ...NO_PRICE,
        priceType: 'paid',
        priceMin: 20000,
        currency: 'XAF',
      }),
      'From 20 000 FCFA',
    );
    assert.equal(
      buildPriceLabel({
        priceType: 'paid',
        priceMin: 20000,
        priceMax: 20000,
        currency: 'XAF',
      }),
      '20 000 FCFA',
    );
  });
});

describe('publicLinkLabel', () => {
  it('names the registration host or the source host', () => {
    assert.deepEqual(
      publicLinkLabel({
        registrationUrl: 'https://ccima.cm/register',
        sourceUrl: 'https://ccima.cm/event',
      }),
      { title: 'Register on ccima.cm', url: 'https://ccima.cm/register' },
    );
    assert.deepEqual(publicLinkLabel({ sourceUrl: 'https://ccima.cm/event' }), {
      title: 'View details on ccima.cm',
      url: 'https://ccima.cm/event',
    });
    assert.deepEqual(publicLinkLabel({}), { title: 'No link stated' });
  });
});

describe('event dates', () => {
  it('formats in the event timezone, not the device timezone', () => {
    assert.equal(
      formatEventDate('2026-10-12T08:00:00.000Z', 'Africa/Douala'),
      'Mon, 12 Oct · 9:00 AM',
    );
    assert.equal(
      buildDateBadge(
        '2026-10-03T23:30:00.000Z',
        'Africa/Douala',
        new Date('2026-10-03T12:00:00.000Z'),
      ),
      'TOMORROW',
    );
  });
});

describe('toEventCard', () => {
  it('maps the canonical event explicitly and honestly', () => {
    const card = toEventCard(
      makeEvent({ publicationStatus: 'cancelled' }),
      new Date('2026-10-03T12:00:00.000Z'),
    );
    assert.equal(card.status, 'cancelled');
    assert.equal(card.trustLabel, 'Not reviewed');
    assert.equal(card.priceLabel, 'Free');
    assert.equal(card.registrationUrl, 'https://example.org/register');
  });
});
