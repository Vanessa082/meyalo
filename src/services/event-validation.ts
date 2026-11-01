/**
 * Boundary validation for curator input. Converts form text into an
 * `EventInput` or returns per-field errors. The database constraints remain
 * the final check.
 */
import type {
  Event,
  EventFormat,
  EventFormValues,
  EventInput,
  EventTaxonomy,
  PriceType,
  SourceType,
} from '../types/event.type.ts';
import { EVENT_FORMATS, PRICE_TYPES, SOURCE_TYPES } from './event-domain.ts';
import { httpsHost } from './url.ts';
import {
  instantToWallTime,
  isValidTimeZone,
  parseWallTime,
  wallTimeToInstant,
} from './zoned-time.ts';

export type EventFieldErrors = Partial<Record<keyof EventFormValues, string>>;

export type EventValidationResult =
  | { ok: true; value: EventInput }
  | { ok: false; errors: EventFieldErrors };

const COUNTRY_CODE = /^[A-Z]{2}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;
const LANGUAGE_CODE = /^[a-z]{2}$/;

export function emptyEventFormValues(): EventFormValues {
  return {
    title: '',
    description: '',
    category: '',
    format: '',
    startAt: '',
    endAt: '',
    timezone: '',
    registrationDeadline: '',
    city: '',
    countryCode: '',
    venueName: '',
    address: '',
    latitude: '',
    longitude: '',
    virtualAccessType: '',
    organizerName: '',
    topics: [],
    offers: [],
    languages: [],
    priceType: '',
    currency: '',
    priceMin: '',
    priceMax: '',
    sourceUrl: '',
    sourceType: '',
    registrationUrl: '',
  };
}

/** Persisted event -> form text. Times are shown in the event timezone. */
export function eventToFormValues(event: Event): EventFormValues {
  const zone = event.timezone ?? 'UTC';
  const wall = (iso: string | null) =>
    iso ? instantToWallTime(iso, zone) : '';
  const text = (value: string | number | null) =>
    value === null ? '' : String(value);
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    format: event.format,
    startAt: wall(event.startAt),
    endAt: wall(event.endAt),
    timezone: event.timezone ?? '',
    registrationDeadline: wall(event.registrationDeadline),
    city: text(event.city),
    countryCode: text(event.countryCode),
    venueName: text(event.venueName),
    address: text(event.address),
    latitude: text(event.latitude),
    longitude: text(event.longitude),
    virtualAccessType: text(event.virtualAccessType),
    organizerName: event.organizerName,
    topics: [...event.topics],
    offers: [...event.offers],
    languages: [...event.languages],
    priceType: event.priceType,
    currency: text(event.currency),
    priceMin: text(event.priceMin),
    priceMax: text(event.priceMax),
    sourceUrl: event.sourceUrl,
    sourceType: event.sourceType,
    registrationUrl: text(event.registrationUrl),
  };
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isOneOf<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return (values as readonly string[]).includes(value);
}

function parseAmount(value: string): number | null | 'invalid' {
  const compact = value.replace(/\s/g, '');
  if (!compact) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(compact)) return 'invalid';
  return Number(compact);
}

function parseCoordinate(
  value: string,
  limit: number,
): number | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return 'invalid';
  const parsed = Number(trimmed);
  return Math.abs(parsed) <= limit ? parsed : 'invalid';
}

export function validateEventInput(
  values: EventFormValues,
  taxonomy: EventTaxonomy,
): EventValidationResult {
  const errors: EventFieldErrors = {};

  const title = values.title.trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > 200) errors.title = 'Title is too long.';

  const description = values.description.trim();
  if (!description) errors.description = 'Description is required.';

  const category = values.category.trim();
  if (!category) errors.category = 'Category is required.';

  const format = values.format;
  if (!isOneOf<EventFormat>(EVENT_FORMATS, format)) {
    errors.format = 'Choose a format.';
  }

  const timezone = values.timezone.trim();
  const zoneValid = isValidTimeZone(timezone);
  if (!timezone) errors.timezone = 'Timezone is required.';
  else if (!zoneValid) errors.timezone = 'Unknown timezone.';

  const toInstant = (
    field: 'startAt' | 'endAt' | 'registrationDeadline',
    required: boolean,
  ): string | null => {
    const raw = values[field].trim();
    if (!raw) {
      if (required) errors[field] = 'Required.';
      return null;
    }
    if (!parseWallTime(raw)) {
      errors[field] = 'Use YYYY-MM-DD HH:mm with a real date.';
      return null;
    }
    return zoneValid ? wallTimeToInstant(raw, timezone) : null;
  };

  const startAt = toInstant('startAt', true);
  const endAt = toInstant('endAt', false);
  const registrationDeadline = toInstant('registrationDeadline', false);

  if (startAt && endAt && Date.parse(endAt) < Date.parse(startAt)) {
    errors.endAt = 'End must be after the start.';
  }
  const finish = endAt ?? startAt;
  if (
    registrationDeadline &&
    finish &&
    Date.parse(registrationDeadline) > Date.parse(finish)
  ) {
    errors.registrationDeadline = 'Registration cannot close after the event.';
  }

  const city = optional(values.city);
  const countryCode = optional(values.countryCode)?.toUpperCase() ?? null;
  const physical = format === 'in_person' || format === 'hybrid';
  if (physical && !city) {
    errors.city = 'City is required for in-person and hybrid events.';
  }
  if (countryCode && !COUNTRY_CODE.test(countryCode)) {
    errors.countryCode = 'Use a two-letter country code, e.g. CM.';
  } else if (physical && !countryCode) {
    errors.countryCode = 'Country is required for in-person and hybrid events.';
  }

  const latitude = parseCoordinate(values.latitude, 90);
  const longitude = parseCoordinate(values.longitude, 180);
  if (latitude === 'invalid') errors.latitude = 'Latitude must be -90 to 90.';
  if (longitude === 'invalid') {
    errors.longitude = 'Longitude must be -180 to 180.';
  }
  if (
    latitude !== 'invalid' &&
    longitude !== 'invalid' &&
    (latitude === null) !== (longitude === null)
  ) {
    errors.latitude = 'Enter both latitude and longitude, or neither.';
  }

  const organizerName = values.organizerName.trim();
  if (!organizerName) errors.organizerName = 'Organizer is required.';

  const sourceUrl = values.sourceUrl.trim();
  if (!sourceUrl) errors.sourceUrl = 'Source link is required.';
  else if (!httpsHost(sourceUrl)) {
    errors.sourceUrl = 'Source link must be a full https:// address.';
  }

  const sourceType = values.sourceType;
  if (!isOneOf<SourceType>(SOURCE_TYPES, sourceType)) {
    errors.sourceType = 'Choose where this event came from.';
  }

  const registrationUrl = optional(values.registrationUrl);
  if (registrationUrl && !httpsHost(registrationUrl)) {
    errors.registrationUrl =
      'Registration link must be a full https:// address.';
  }

  const priceType = values.priceType;
  if (!isOneOf<PriceType>(PRICE_TYPES, priceType)) {
    errors.priceType = 'Choose a price type.';
  }
  const priceMin = parseAmount(values.priceMin);
  const priceMax = parseAmount(values.priceMax);
  const currency = optional(values.currency)?.toUpperCase() ?? null;
  if (priceMin === 'invalid') errors.priceMin = 'Enter an amount, e.g. 5000.';
  if (priceMax === 'invalid') errors.priceMax = 'Enter an amount, e.g. 5000.';
  const hasAmount =
    (priceMin !== null && priceMin !== 'invalid') ||
    (priceMax !== null && priceMax !== 'invalid');
  if (
    hasAmount &&
    priceType !== 'paid' &&
    priceType !== 'variable' &&
    isOneOf<PriceType>(PRICE_TYPES, priceType)
  ) {
    errors.priceMin = 'Amounts are only for paid or varying prices.';
  }
  if (
    typeof priceMin === 'number' &&
    typeof priceMax === 'number' &&
    priceMin > priceMax
  ) {
    errors.priceMax = 'Maximum must be at least the minimum.';
  }
  if (currency && !CURRENCY_CODE.test(currency)) {
    errors.currency = 'Use a three-letter currency code, e.g. XAF.';
  } else if (hasAmount && !currency) {
    errors.currency = 'Currency is required with an amount.';
  }

  const unknownTopic = values.topics.find(
    (topic) => !taxonomy.topics.includes(topic),
  );
  if (unknownTopic) errors.topics = `Unknown topic: ${unknownTopic}.`;
  const unknownOffer = values.offers.find(
    (offer) => !taxonomy.offers.includes(offer),
  );
  if (unknownOffer) errors.offers = `Unknown offer: ${unknownOffer}.`;
  if (values.languages.length === 0) {
    errors.languages = 'Choose at least one event language.';
  } else if (values.languages.some((code) => !LANGUAGE_CODE.test(code))) {
    errors.languages = 'Languages must be two-letter codes, e.g. fr.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      description,
      category,
      format: format as EventFormat,
      startAt: startAt as string,
      endAt,
      timezone,
      registrationDeadline,
      city,
      countryCode,
      venueName: optional(values.venueName),
      address: optional(values.address),
      latitude: latitude as number | null,
      longitude: longitude as number | null,
      virtualAccessType: optional(values.virtualAccessType),
      organizerName,
      topics: [...new Set(values.topics)],
      offers: [...new Set(values.offers)],
      languages: [...new Set(values.languages)],
      priceType: priceType as PriceType,
      currency,
      priceMin: priceMin as number | null,
      priceMax: priceMax as number | null,
      sourceUrl,
      sourceType: sourceType as SourceType,
      registrationUrl,
    },
  };
}
