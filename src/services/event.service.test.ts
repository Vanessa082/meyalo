import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createLocalizer } from '../i18n/translate.ts';
import { makeEvent } from '../test-support/event-fixtures.ts';
import {
  buildDateBadge,
  buildPriceLabel,
  buildTrustLabel,
  buildVerificationText,
  dateParts,
  describeEventCard,
  formatEventDate,
  publicLinkLabel,
  toEventCard,
} from './event-mapping.ts';

// The real catalogs, so a missing or wrong translation fails here.
const readCatalog = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../i18n/messages/${name}.json`, import.meta.url),
      'utf8',
    ),
  );
const catalogs = { en: readCatalog('en'), fr: readCatalog('fr') };
const en = createLocalizer(catalogs, 'en');
const fr = createLocalizer(catalogs, 'fr');

const NO_PRICE = {
  priceType: 'unknown',
  priceMin: null,
  priceMax: null,
  currency: null,
} as const;

describe('buildTrustLabel', () => {
  it('names the verification state and does not say verified', () => {
    assert.equal(buildTrustLabel('source_confirmed', en), 'Source confirmed');
    assert.equal(
      buildTrustLabel('organizer_confirmed', en),
      'Confirmed by organizer',
    );
    assert.equal(buildTrustLabel('unreviewed', en), 'Not reviewed');
  });

  it('speaks French to French users', () => {
    assert.equal(buildTrustLabel('source_confirmed', fr), 'Source confirmée');
    assert.equal(
      buildTrustLabel('organizer_confirmed', fr),
      "Confirmé par l'organisateur",
    );
    assert.equal(buildTrustLabel('unreviewed', fr), 'Non vérifié');
  });
});

describe('buildVerificationText', () => {
  const now = new Date('2026-10-02T12:00:00.000Z');

  it('shows the check date for a recent confirmation and a warning when stale', () => {
    assert.equal(
      buildVerificationText(
        'source_confirmed',
        '2026-09-28T00:00:00.000Z',
        en,
        now,
      ),
      'Source confirmed · Checked 28 Sept 2026',
    );
    assert.equal(
      buildVerificationText(
        'source_confirmed',
        '2026-08-01T00:00:00.000Z',
        en,
        now,
      ),
      'Details may have changed. Confirm at the source.',
    );
    assert.equal(
      buildVerificationText('unreviewed', '2026-10-01T00:00:00.000Z', en, now),
      'Not reviewed',
    );
  });

  it('formats the check date and the warning in French', () => {
    assert.equal(
      buildVerificationText(
        'source_confirmed',
        '2026-09-28T00:00:00.000Z',
        fr,
        now,
      ),
      'Source confirmée · Vérifié le 28 sept. 2026',
    );
    assert.equal(
      buildVerificationText(
        'source_confirmed',
        '2026-08-01T00:00:00.000Z',
        fr,
        now,
      ),
      'Les détails ont peut-être changé. Vérifiez à la source.',
    );
  });
});

describe('buildPriceLabel', () => {
  it('keeps an explicit free price and does not invent one', () => {
    assert.equal(
      buildPriceLabel({ ...NO_PRICE, priceType: 'free' }, en),
      'Free',
    );
    assert.equal(buildPriceLabel(NO_PRICE, en), 'Price not stated');
    assert.equal(
      buildPriceLabel(
        { ...NO_PRICE, priceType: 'paid', priceMin: 20000, currency: 'XAF' },
        en,
      ),
      'From 20 000 FCFA',
    );
    assert.equal(
      buildPriceLabel(
        {
          priceType: 'paid',
          priceMin: 20000,
          priceMax: 20000,
          currency: 'XAF',
        },
        en,
      ),
      '20 000 FCFA',
    );
  });

  it('labels prices in French and keeps the FCFA amount format', () => {
    assert.equal(
      buildPriceLabel({ ...NO_PRICE, priceType: 'free' }, fr),
      'Gratuit',
    );
    assert.equal(
      buildPriceLabel({ ...NO_PRICE, priceType: 'free_with_registration' }, fr),
      'Gratuit sur inscription',
    );
    assert.equal(buildPriceLabel(NO_PRICE, fr), 'Prix non indiqué');
    assert.equal(
      buildPriceLabel({ ...NO_PRICE, priceType: 'variable' }, fr),
      'Prix variable',
    );
    assert.equal(
      buildPriceLabel(
        { ...NO_PRICE, priceType: 'paid', priceMin: 20000, currency: 'XAF' },
        fr,
      ),
      'À partir de 20 000 FCFA',
    );
    assert.equal(
      buildPriceLabel(
        {
          priceType: 'paid',
          priceMin: 5000,
          priceMax: 20000,
          currency: 'XOF',
        },
        fr,
      ),
      '5 000 FCFA – 20 000 FCFA',
    );
  });

  it('says not stated for a saved copy that has no amounts', () => {
    const legacy = {
      priceType: 'paid',
      currency: 'XAF',
    } as unknown as Parameters<typeof buildPriceLabel>[0];
    assert.equal(buildPriceLabel(legacy, fr), 'Prix non indiqué');
  });

  it('uses the language decimal separator for other currencies', () => {
    const price = {
      priceType: 'paid',
      priceMin: 12.5,
      priceMax: 12.5,
      currency: 'EUR',
    } as const;
    assert.equal(buildPriceLabel(price, en), '12.50 EUR');
    assert.equal(buildPriceLabel(price, fr), '12,50 EUR');
  });
});

describe('publicLinkLabel', () => {
  it('names the registration host or the source host', () => {
    assert.deepEqual(
      publicLinkLabel(
        {
          registrationUrl: 'https://ccima.cm/register',
          sourceUrl: 'https://ccima.cm/event',
        },
        en,
      ),
      { title: 'Register on ccima.cm', url: 'https://ccima.cm/register' },
    );
    assert.deepEqual(
      publicLinkLabel({ sourceUrl: 'https://ccima.cm/event' }, en),
      { title: 'View details on ccima.cm', url: 'https://ccima.cm/event' },
    );
    assert.deepEqual(publicLinkLabel({}, en), { title: 'No link stated' });
  });

  it('speaks French to French users', () => {
    assert.deepEqual(
      publicLinkLabel({ registrationUrl: 'https://ccima.cm/register' }, fr),
      { title: "S'inscrire sur ccima.cm", url: 'https://ccima.cm/register' },
    );
    assert.deepEqual(
      publicLinkLabel({ sourceUrl: 'https://ccima.cm/event' }, fr),
      { title: 'Voir les détails sur ccima.cm', url: 'https://ccima.cm/event' },
    );
    assert.deepEqual(publicLinkLabel({}, fr), { title: 'Aucun lien indiqué' });
  });
});

describe('event dates', () => {
  it('formats in the event timezone, not the device timezone', () => {
    assert.equal(
      formatEventDate('2026-10-12T08:00:00.000Z', 'Africa/Douala', en),
      'Mon 12 Oct · 9:00 am',
    );
    assert.equal(
      formatEventDate('2026-10-03T08:00:00.000Z', 'Africa/Douala', fr),
      'sam. 3 oct. · 09:00',
    );
  });

  it('says UTC when the event has no timezone', () => {
    assert.equal(
      formatEventDate('2026-10-12T08:00:00.000Z', null, en),
      'Mon 12 Oct · 8:00 am UTC',
    );
    assert.equal(
      formatEventDate('2026-10-12T08:00:00.000Z', null, fr),
      'lun. 12 oct. · 08:00 UTC',
    );
  });

  it('says the date is not stated instead of showing a broken date', () => {
    assert.equal(
      formatEventDate('not a date', 'Africa/Douala', fr),
      'Date non indiquée',
    );
    assert.equal(
      formatEventDate('2026-10-12T08:00:00.000Z', 'Mars/Olympus', en),
      'Date not stated',
    );
  });

  it('badges today, tomorrow and later days by calendar day in the event timezone', () => {
    const now = new Date('2026-10-03T12:00:00.000Z');
    const badge = (startAt: string, i18n: typeof en) =>
      buildDateBadge(startAt, 'Africa/Douala', i18n, now);

    assert.deepEqual(badge('2026-10-03T18:00:00.000Z', en), {
      kind: 'today',
      text: 'TODAY',
    });
    assert.deepEqual(badge('2026-10-03T23:30:00.000Z', en), {
      kind: 'tomorrow',
      text: 'TOMORROW',
    });
    assert.deepEqual(badge('2026-10-05T08:00:00.000Z', en), {
      kind: 'date',
      text: '05 OCT',
    });
    assert.deepEqual(badge('2026-10-03T18:00:00.000Z', fr), {
      kind: 'today',
      text: "AUJOURD'HUI",
    });
    assert.deepEqual(badge('2026-10-03T23:30:00.000Z', fr), {
      kind: 'tomorrow',
      text: 'DEMAIN',
    });
    assert.deepEqual(badge('2026-10-05T08:00:00.000Z', fr), {
      kind: 'date',
      text: '05 OCT.',
    });
  });
});

describe('toEventCard', () => {
  it('passes the image on with its alt text and credit, small for cards', () => {
    const card = toEventCard(
      makeEvent({
        coverImage: {
          path: 'evt/abc',
          smallUrl: 'https://cdn.example/evt/abc-640.webp',
          largeUrl: 'https://cdn.example/evt/abc-1600.webp',
          alt: 'A speaker on stage',
          credit: 'Photo: the organiser',
          rights: 'organizer_provided',
        },
      }),
    );
    assert.equal(card.coverImageUrl, 'https://cdn.example/evt/abc-640.webp');
    assert.equal(
      card.coverImageLargeUrl,
      'https://cdn.example/evt/abc-1600.webp',
    );
    assert.equal(card.coverImageAlt, 'A speaker on stage');
    assert.equal(card.coverImageCredit, 'Photo: the organiser');
    assert.equal(toEventCard(makeEvent()).coverImageUrl, undefined);
  });

  it('maps the canonical event explicitly and honestly', () => {
    const card = toEventCard(makeEvent({ publicationStatus: 'cancelled' }));
    assert.equal(card.status, 'cancelled');
    assert.equal(card.verificationState, 'unreviewed');
    assert.equal(card.priceType, 'free');
    assert.equal(card.registrationUrl, 'https://example.org/register');
  });

  it('keeps the price as data so any language can label it', () => {
    const card = toEventCard(
      makeEvent({
        priceType: 'paid',
        priceMin: 20000,
        priceMax: null,
        currency: 'XAF',
      }),
    );
    assert.equal(card.priceMin, 20000);
    assert.equal(card.priceMax, null);
    assert.equal(card.currency, 'XAF');
  });
});

describe('describeEventCard', () => {
  const now = new Date('2026-10-03T12:00:00.000Z');
  const card = toEventCard(
    makeEvent({
      startAt: '2026-10-03T23:30:00.000Z',
      verificationState: 'source_confirmed',
      lastCheckedAt: '2026-10-01T00:00:00.000Z',
    }),
  );

  it('gives every display string in the app language', () => {
    assert.deepEqual(describeEventCard(card, fr, now), {
      dateText: 'dim. 4 oct. · 00:30',
      badge: { kind: 'tomorrow', text: 'DEMAIN' },
      priceLabel: 'Gratuit',
      trustLabel: 'Source confirmée',
      verificationText: 'Source confirmée · Vérifié le 1 oct. 2026',
    });
    assert.equal(describeEventCard(card, en, now).priceLabel, 'Free');
  });

  it('leaves trust text out when the state is unknown, as in old snapshots', () => {
    const text = describeEventCard(
      { ...card, verificationState: undefined },
      fr,
      now,
    );
    assert.equal(text.trustLabel, undefined);
    assert.equal(text.verificationText, undefined);
  });
});

describe('dateParts', () => {
  it('splits the date in the event timezone, in the app language', () => {
    // 23:30 UTC on Friday 20 Nov is Saturday 21 Nov in Douala.
    assert.deepEqual(dateParts('2026-11-20T23:30:00Z', 'Africa/Douala', en), {
      day: '21',
      month: 'NOV',
      weekday: 'SAT',
    });
    assert.deepEqual(dateParts('2026-11-20T23:30:00Z', 'Africa/Douala', fr), {
      day: '21',
      month: 'NOV.',
      weekday: 'SAM.',
    });
  });
});
