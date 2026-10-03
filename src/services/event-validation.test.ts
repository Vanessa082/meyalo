import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  makeEvent,
  TAXONOMY,
  validFormValues,
} from '../test-support/event-fixtures.ts';
import type { EventFormValues } from '../types/event.type.ts';
import { eventToFormValues, validateEventInput } from './event-validation.ts';

function errorsFor(overrides: Partial<EventFormValues>) {
  const result = validateEventInput(validFormValues(overrides), TAXONOMY);
  assert.equal(result.ok, false, 'expected validation to fail');
  return result.ok ? {} : result.errors;
}

describe('validateEventInput', () => {
  it('accepts a complete event and converts wall time in the event timezone', () => {
    const result = validateEventInput(validFormValues(), TAXONOMY);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.startAt, '2026-11-10T08:00:00.000Z');
    assert.equal(result.value.endAt, '2026-11-10T12:00:00.000Z');
    assert.equal(result.value.countryCode, 'CM');
    assert.equal(result.value.registrationUrl, null);
    assert.equal(result.value.latitude, null);
  });

  it('requires title, description, category, organizer, start, timezone and source', () => {
    const errors = errorsFor({
      title: ' ',
      description: '',
      category: '',
      organizerName: '',
      startAt: '',
      timezone: '',
      sourceUrl: '',
    });
    for (const field of [
      'title',
      'description',
      'category',
      'organizerName',
      'startAt',
      'timezone',
      'sourceUrl',
    ] as const) {
      assert.ok(errors[field], `${field} should be required`);
    }
  });

  it('requires city and country for in-person and hybrid events only', () => {
    const errors = errorsFor({ city: '', countryCode: '' });
    assert.ok(errors.city);
    assert.ok(errors.countryCode);

    const online = validateEventInput(
      validFormValues({ format: 'virtual', city: '', countryCode: '' }),
      TAXONOMY,
    );
    assert.equal(online.ok, true);
  });

  it('rejects malformed and non-https URLs', () => {
    assert.ok(errorsFor({ sourceUrl: 'example.org/event' }).sourceUrl);
    assert.ok(errorsFor({ sourceUrl: 'http://example.org' }).sourceUrl);
    assert.ok(errorsFor({ sourceUrl: 'https://' }).sourceUrl);
    assert.ok(
      errorsFor({ registrationUrl: 'javascript:alert(1)' }).registrationUrl,
    );
  });

  it('rejects impossible or badly formatted dates and inverted ranges', () => {
    assert.ok(errorsFor({ startAt: '2026-02-30 09:00' }).startAt);
    assert.ok(errorsFor({ startAt: '10/11/2026 9am' }).startAt);
    assert.ok(errorsFor({ startAt: '2026-11-10 25:00' }).startAt);
    assert.ok(errorsFor({ endAt: '2026-11-10 08:00' }).endAt);
    assert.ok(
      errorsFor({ registrationDeadline: '2026-11-11 09:00' })
        .registrationDeadline,
    );
  });

  it('rejects an unknown timezone', () => {
    assert.ok(errorsFor({ timezone: 'Africa/Atlantis' }).timezone);
    assert.ok(errorsFor({ timezone: 'WAT' }).timezone);
  });

  it('rejects values outside the enums and taxonomy', () => {
    assert.ok(errorsFor({ format: 'physical' }).format);
    assert.ok(errorsFor({ sourceType: 'official_website' }).sourceType);
    assert.ok(errorsFor({ priceType: 'cheap' }).priceType);
    assert.ok(errorsFor({ topics: ['astrology'] }).topics);
    assert.ok(errorsFor({ offers: ['free_food'] }).offers);
    assert.ok(errorsFor({ languages: [] }).languages);
    assert.ok(errorsFor({ languages: ['french'] }).languages);
  });

  it('checks prices: amounts need paid/variable and a currency, min <= max', () => {
    assert.ok(errorsFor({ priceMin: '5000', currency: 'XAF' }).priceMin);
    assert.ok(errorsFor({ priceType: 'paid', priceMin: '5000' }).currency);
    assert.ok(
      errorsFor({
        priceType: 'paid',
        priceMin: '9000',
        priceMax: '5000',
        currency: 'XAF',
      }).priceMax,
    );
    assert.ok(errorsFor({ priceType: 'paid', priceMin: 'abc' }).priceMin);
    const paid = validateEventInput(
      validFormValues({
        priceType: 'paid',
        priceMin: '5 000',
        currency: 'xaf',
      }),
      TAXONOMY,
    );
    assert.equal(paid.ok, true);
    if (paid.ok) {
      assert.equal(paid.value.priceMin, 5000);
      assert.equal(paid.value.currency, 'XAF');
    }
  });

  it('needs both coordinates or neither, within range', () => {
    assert.ok(errorsFor({ latitude: '4.05' }).latitude);
    assert.ok(errorsFor({ latitude: '91', longitude: '9' }).latitude);
    assert.ok(errorsFor({ latitude: '4', longitude: '181' }).longitude);
  });
});

describe('eventToFormValues', () => {
  it('round-trips a persisted event through validation unchanged', () => {
    const event = makeEvent();
    const result = validateEventInput(eventToFormValues(event), TAXONOMY);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.startAt, event.startAt);
    assert.equal(result.value.endAt, event.endAt);
    assert.equal(result.value.latitude, event.latitude);
    assert.equal(result.value.registrationUrl, event.registrationUrl);
  });
});
