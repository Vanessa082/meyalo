import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPriceLabel,
  buildTrustLabel,
  buildVerificationText,
  coverImageUrl,
  mapFormat,
  publicLinkLabel,
  verificationState,
} from './event-mapping.ts';

describe('mapFormat', () => {
  it('maps stored format values onto the app format', () => {
    assert.equal(mapFormat('physical'), 'in_person');
    assert.equal(mapFormat('in_person'), 'in_person');
    assert.equal(mapFormat('hybrid'), 'hybrid');
    assert.equal(mapFormat('online'), 'virtual');
  });
});

describe('verificationState', () => {
  it('uses only verification_state and ignores a leftover is_verified flag', () => {
    assert.equal(
      verificationState({ verification_state: 'source_confirmed' }),
      'source_confirmed',
    );
    assert.equal(
      verificationState({ verification_state: 'organizer_confirmed' }),
      'organizer_confirmed',
    );
    assert.equal(
      verificationState({
        verification_state: 'unreviewed',
        is_verified: true,
      }),
      'unreviewed',
    );
    assert.equal(verificationState({ is_verified: true }), 'unreviewed');
    assert.equal(verificationState({}), 'unreviewed');
  });
});

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
    assert.equal(buildPriceLabel({ price_type: 'free' }), 'Free');
    assert.equal(
      buildPriceLabel({ price_type: 'unknown' }),
      'Price not stated',
    );
    assert.equal(buildPriceLabel({}), 'Price not stated');
    assert.equal(
      buildPriceLabel({
        price_type: 'paid',
        price_min: 20000,
        currency: 'XAF',
      }),
      'From 20 000 FCFA',
    );
    assert.equal(
      buildPriceLabel({
        price_type: 'paid',
        price_min: 20000,
        price_max: 20000,
        currency: 'XAF',
      }),
      '20 000 FCFA',
    );
  });
});

describe('coverImageUrl', () => {
  it('uses only an https image on the event row', () => {
    assert.equal(
      coverImageUrl({ cover_image_url: 'https://cdn.example/event.jpg' }),
      'https://cdn.example/event.jpg',
    );
    assert.equal(coverImageUrl({}), undefined);
    assert.equal(
      coverImageUrl({ cover_image_url: 'http://cdn.example/event.jpg' }),
      undefined,
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
