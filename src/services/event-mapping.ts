/**
 * Explicit conversions from the canonical `Event` to consumer display values.
 * No database or environment access, so it runs under the Node test runner.
 */
import { LOCALES } from '../i18n/format.ts';
import type { TranslationParams, TxKeyPath } from '../i18n/index.ts';
import type { AppLanguage } from '../i18n/language.ts';
import type {
  Event,
  EventCardData,
  VerificationState,
} from '../types/event.type.ts';
import { httpsHost } from './url.ts';
import { instantToWallTime, isValidTimeZone } from './zoned-time.ts';

/**
 * The app language and its translator: what `useTranslation()` returns, so
 * screens pass it straight in. Display strings are built at render time, not
 * stored on the card, because cards are cached on the phone and outlive a
 * language change.
 */
export interface Localizer {
  language: AppLanguage;
  t(key: TxKeyPath, params?: TranslationParams): string;
}

const STALE_CHECK_MS = 14 * 24 * 60 * 60 * 1000;

export function buildTrustLabel(
  state: VerificationState,
  i18n: Localizer,
): string {
  if (state === 'organizer_confirmed') {
    return i18n.t('eventText.organizerConfirmed');
  }
  if (state === 'source_confirmed') return i18n.t('eventText.sourceConfirmed');
  return i18n.t('eventDetail.notReviewed');
}

export function buildVerificationText(
  state: VerificationState,
  lastChecked: string | null,
  i18n: Localizer,
  now: Date = new Date(),
): string {
  const label = buildTrustLabel(state, i18n);
  if (state === 'unreviewed' || !lastChecked) return label;

  const checked = new Date(lastChecked);
  if (Number.isNaN(checked.getTime())) return label;
  if (now.getTime() - checked.getTime() >= STALE_CHECK_MS) {
    return i18n.t('eventText.mayHaveChanged');
  }
  const date = new Intl.DateTimeFormat(LOCALES[i18n.language], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(checked);
  return i18n.t('eventText.checkedOn', { label, date });
}

export function buildPriceLabel(
  event: Pick<Event, 'priceType' | 'priceMin' | 'priceMax' | 'currency'>,
  i18n: Localizer,
): string {
  const { priceType, currency } = event;
  // Saved copies from before prices were kept as data have no amounts.
  const min = event.priceMin ?? null;
  const max = event.priceMax ?? null;
  const notStated = i18n.t('eventCard.priceNotStated');
  if (priceType === 'free') return i18n.t('eventText.free');
  if (priceType === 'free_with_registration') {
    return i18n.t('eventText.freeWithRegistration');
  }

  if (priceType === 'paid' || priceType === 'variable') {
    const money = (amount: number) =>
      formatMoney(amount, currency, i18n.language);
    if (min === null && max === null) {
      return priceType === 'variable'
        ? i18n.t('eventText.priceVaries')
        : notStated;
    }
    if (min !== null && max !== null && min !== max) {
      return `${money(min)} – ${money(max)}`;
    }
    const amount = min ?? max;
    if (amount === null) return notStated;
    if (max === null)
      return i18n.t('eventText.priceFrom', { amount: money(amount) });
    return money(amount);
  }

  return notStated;
}

export function publicLinkLabel(
  event: { registrationUrl?: string | null; sourceUrl?: string | null },
  i18n: Localizer,
): { title: string; url?: string } {
  const registrationHost = httpsHost(event.registrationUrl);
  if (registrationHost && event.registrationUrl) {
    return {
      title: i18n.t('eventText.registerOn', { host: registrationHost }),
      url: event.registrationUrl,
    };
  }
  const sourceHost = httpsHost(event.sourceUrl);
  if (sourceHost && event.sourceUrl) {
    return {
      title: i18n.t('eventText.viewDetailsOn', { host: sourceHost }),
      url: event.sourceUrl,
    };
  }
  return { title: i18n.t('eventText.noLink') };
}

/** Hour style per language: "9:00 am" in English, "09:00" in French. */
const TIME_OPTIONS: Record<AppLanguage, Intl.DateTimeFormatOptions> = {
  en: { hour: 'numeric', minute: '2-digit', hour12: true },
  fr: { hour: '2-digit', minute: '2-digit', hour12: false },
};

/**
 * "Mon 5 Oct · 9:00 am" / "lun. 5 oct. · 09:00", in the event timezone.
 * A missing timezone is shown as UTC and says so.
 */
export function formatEventDate(
  startAt: string,
  timezone: string | null,
  i18n: Localizer,
): string {
  const start = new Date(startAt);
  const timeZone = timezone || 'UTC';
  if (Number.isNaN(start.getTime()) || !isValidTimeZone(timeZone)) {
    return i18n.t('eventText.dateNotStated');
  }
  const locale = LOCALES[i18n.language];
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(start);
  const time = new Intl.DateTimeFormat(locale, {
    ...TIME_OPTIONS[i18n.language],
    timeZone,
  }).format(start);
  return `${day} · ${time}${timezone ? '' : ' UTC'}`;
}

export interface DateBadge {
  kind: 'today' | 'tomorrow' | 'date';
  text: string;
}

/** Today, tomorrow or "05 OCT", by calendar day in the event timezone. */
export function buildDateBadge(
  startAt: string,
  timezone: string | null,
  i18n: Localizer,
  now: Date = new Date(),
): DateBadge | null {
  const timeZone = timezone || 'UTC';
  const eventDay = instantToWallTime(startAt, timeZone).slice(0, 10);
  const today = instantToWallTime(now.toISOString(), timeZone).slice(0, 10);
  if (!eventDay || !today) return null;
  const dayMs = (value: string) => Date.parse(`${value}T00:00:00Z`);
  const diffDays = Math.round((dayMs(eventDay) - dayMs(today)) / 86_400_000);
  if (diffDays === 0) return { kind: 'today', text: i18n.t('eventText.today') };
  if (diffDays === 1) {
    return { kind: 'tomorrow', text: i18n.t('eventText.tomorrow') };
  }
  const locale = LOCALES[i18n.language];
  const text = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    timeZone,
  })
    .format(new Date(startAt))
    .toLocaleUpperCase(locale);
  return { kind: 'date', text };
}

/** Day number, short month and weekday for a date block, e.g. 21 / NOV / SAT,
 *  in the event timezone and the app language. */
export function dateParts(
  startAt: string,
  timezone: string | null,
  i18n: Localizer,
): { day: string; month: string; weekday: string } {
  const locale = LOCALES[i18n.language];
  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone: timezone || 'UTC',
  }).formatToParts(new Date(startAt));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    (parts.find((p) => p.type === type)?.value ?? '').toLocaleUpperCase(locale);
  return { day: part('day'), month: part('month'), weekday: part('weekday') };
}

export interface EventCardText {
  dateText: string;
  badge: DateBadge | null;
  priceLabel: string;
  /** Absent when the card has no verification state (older saved copies). */
  trustLabel?: string;
  verificationText?: string;
}

/** Every display string of a card, in the app language. */
export function describeEventCard(
  card: EventCardData,
  i18n: Localizer,
  now: Date = new Date(),
): EventCardText {
  const timezone = card.timezone || null;
  const state = card.verificationState;
  return {
    dateText: formatEventDate(card.startsAt, timezone, i18n),
    badge: buildDateBadge(card.startsAt, timezone, i18n, now),
    priceLabel: buildPriceLabel(card, i18n),
    trustLabel: state ? buildTrustLabel(state, i18n) : undefined,
    verificationText: state
      ? buildVerificationText(state, card.lastCheckedAt ?? null, i18n, now)
      : undefined,
  };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Canonical event -> consumer card view model. */
export function toEventCard(event: Event): EventCardData {
  return {
    id: event.id,
    slug: slugify(event.title),
    title: event.title,
    organizerName: event.organizerName,
    eventType: event.category,
    primaryCategory: event.category,
    startsAt: event.startAt,
    endsAt: event.endAt ?? undefined,
    timezone: event.timezone ?? '',
    format: event.format,
    venueName: event.venueName ?? undefined,
    address: event.address ?? undefined,
    city: event.city ?? undefined,
    countryCode: event.countryCode ?? undefined,
    latitude: event.latitude ?? undefined,
    longitude: event.longitude ?? undefined,
    topics: event.topics,
    offers: event.offers,
    languages: event.languages,
    priceType: event.priceType,
    priceMin: event.priceMin,
    priceMax: event.priceMax,
    currency: event.currency,
    registrationUrl: event.registrationUrl ?? undefined,
    coverImageUrl: event.coverImage?.smallUrl,
    coverImageLargeUrl: event.coverImage?.largeUrl,
    coverImageAlt: event.coverImage?.alt,
    coverImageCredit: event.coverImage?.credit ?? undefined,
    registrationDeadline: event.registrationDeadline ?? undefined,
    status:
      event.publicationStatus === 'cancelled'
        ? 'cancelled'
        : event.publicationStatus === 'ended'
          ? 'completed'
          : 'scheduled',
    verificationState: event.verificationState,
    lastCheckedAt: event.lastCheckedAt ?? undefined,
    sourceUrl: event.sourceUrl,
    description: event.description,
  };
}

/** "20 000 FCFA" in every language; only the decimal separator follows it. */
function formatMoney(
  amount: number,
  currency: string | null,
  language: AppLanguage,
): string {
  const [whole, fraction] = amount.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimal = language === 'fr' ? ',' : '.';
  const formatted =
    fraction === '00' ? grouped : `${grouped}${decimal}${fraction}`;
  if (currency === 'XAF' || currency === 'XOF') return `${formatted} FCFA`;
  if (currency) return `${formatted} ${currency}`;
  return formatted;
}
