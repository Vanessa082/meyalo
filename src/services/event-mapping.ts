/**
 * Explicit conversions from the canonical `Event` to consumer display values.
 * No database or environment access, so it runs under the Node test runner.
 */
import type {
  Event,
  EventCardData,
  VerificationState,
} from '../types/event.type.ts';
import { httpsHost } from './url.ts';
import { instantToWallTime } from './zoned-time.ts';

const STALE_CHECK_MS = 14 * 24 * 60 * 60 * 1000;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function buildTrustLabel(state: VerificationState): string {
  if (state === 'organizer_confirmed') return 'Confirmed by organizer';
  if (state === 'source_confirmed') return 'Source confirmed';
  return 'Not reviewed';
}

export function buildVerificationText(
  state: VerificationState,
  lastChecked: string | null,
  now: Date = new Date(),
): string {
  const label = buildTrustLabel(state);
  if (state === 'unreviewed' || !lastChecked) return label;

  const checked = new Date(lastChecked);
  if (Number.isNaN(checked.getTime())) return label;
  if (now.getTime() - checked.getTime() >= STALE_CHECK_MS) {
    return 'Details may have changed — confirm at source';
  }
  const date = `${checked.getUTCDate()} ${MONTHS[checked.getUTCMonth()]} ${checked.getUTCFullYear()}`;
  return `${label} · Checked ${date}`;
}

export function buildPriceLabel(
  event: Pick<Event, 'priceType' | 'priceMin' | 'priceMax' | 'currency'>,
): string {
  const { priceType, priceMin: min, priceMax: max, currency } = event;
  if (priceType === 'free') return 'Free';
  if (priceType === 'free_with_registration') return 'Free with registration';

  if (priceType === 'paid' || priceType === 'variable') {
    if (min === null && max === null) {
      return priceType === 'variable' ? 'Price varies' : 'Price not stated';
    }
    if (min !== null && max !== null && min !== max) {
      return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
    }
    const amount = min ?? max;
    if (amount === null) return 'Price not stated';
    if (max === null) return `From ${formatMoney(amount, currency)}`;
    return formatMoney(amount, currency);
  }

  return 'Price not stated';
}

export function publicLinkLabel(event: {
  registrationUrl?: string | null;
  sourceUrl?: string | null;
}): { title: string; url?: string } {
  const registrationHost = httpsHost(event.registrationUrl);
  if (registrationHost && event.registrationUrl) {
    return {
      title: `Register on ${registrationHost}`,
      url: event.registrationUrl,
    };
  }
  const sourceHost = httpsHost(event.sourceUrl);
  if (sourceHost && event.sourceUrl) {
    return { title: `View details on ${sourceHost}`, url: event.sourceUrl };
  }
  return { title: 'No link stated' };
}

/** "Sat, 3 Oct · 9:00 AM" in the event timezone. */
export function formatEventDate(
  startAt: string,
  timezone: string | null,
): string {
  const zone = timezone ?? 'UTC';
  const wall = instantToWallTime(startAt, zone);
  if (!wall) return 'Date not stated';
  const [date, time] = wall.split(' ');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ];
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  const minutes = minute.toString().padStart(2, '0');
  const zoneNote = timezone ? '' : ' UTC';
  return `${weekday}, ${day} ${MONTHS[month - 1]} · ${hour12}:${minutes} ${suffix}${zoneNote}`;
}

/** "TODAY", "TOMORROW" or "OCT 05", by calendar day in the event timezone. */
export function buildDateBadge(
  startAt: string,
  timezone: string | null,
  now: Date = new Date(),
): string {
  const zone = timezone ?? 'UTC';
  const eventDay = instantToWallTime(startAt, zone).slice(0, 10);
  const today = instantToWallTime(now.toISOString(), zone).slice(0, 10);
  if (!eventDay || !today) return '';
  const dayMs = (value: string) => Date.parse(`${value}T00:00:00Z`);
  const diffDays = Math.round((dayMs(eventDay) - dayMs(today)) / 86_400_000);
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  const [, month, day] = eventDay.split('-').map(Number);
  return `${MONTHS[month - 1].toUpperCase()} ${day.toString().padStart(2, '0')}`;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Canonical event -> consumer card view model. */
export function toEventCard(
  event: Event,
  now: Date = new Date(),
): EventCardData {
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
    city: event.city ?? undefined,
    countryCode: event.countryCode ?? undefined,
    priceType: event.priceType,
    priceLabel: buildPriceLabel(event),
    registrationUrl: event.registrationUrl ?? undefined,
    status:
      event.publicationStatus === 'cancelled'
        ? 'cancelled'
        : event.publicationStatus === 'ended'
          ? 'completed'
          : 'scheduled',
    verificationState: event.verificationState,
    trustLabel: buildTrustLabel(event.verificationState),
    lastCheckedAt: event.lastCheckedAt ?? undefined,
    verificationText: buildVerificationText(
      event.verificationState,
      event.lastCheckedAt,
      now,
    ),
    sourceUrl: event.sourceUrl,
    description: event.description,
    dateFormatted: formatEventDate(event.startAt, event.timezone),
    dateBadgeText: buildDateBadge(event.startAt, event.timezone, now),
  };
}

function formatMoney(amount: number, currency: string | null): string {
  const [whole, fraction] = amount.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formatted = fraction === '00' ? grouped : `${grouped}.${fraction}`;
  if (currency === 'XAF' || currency === 'XOF') return `${formatted} FCFA`;
  if (currency) return `${formatted} ${currency}`;
  return formatted;
}
