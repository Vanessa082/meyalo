/**
 * Pure event-field mapping. No database or environment access, so it can be
 * tested without the Supabase client.
 *
 * Verification comes only from verification_state. The removed is_verified
 * flag is not read.
 */

export type VerificationState =
  | 'unreviewed'
  | 'source_confirmed'
  | 'organizer_confirmed';

const STALE_CHECK_MS = 14 * 24 * 60 * 60 * 1000;

export function mapFormat(format: string): 'in_person' | 'virtual' | 'hybrid' {
  if (format === 'physical' || format === 'in_person') return 'in_person';
  if (format === 'hybrid') return 'hybrid';
  return 'virtual';
}

export function verificationState(row: {
  verification_state?: unknown;
}): VerificationState {
  if (
    row.verification_state === 'source_confirmed' ||
    row.verification_state === 'organizer_confirmed' ||
    row.verification_state === 'unreviewed'
  ) {
    return row.verification_state;
  }
  return 'unreviewed';
}

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

  const months = [
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
  const date = `${checked.getUTCDate()} ${months[checked.getUTCMonth()]} ${checked.getUTCFullYear()}`;
  return `${label} · Checked ${date}`;
}

export function buildPriceLabel(row: {
  price_type?: unknown;
  price_min?: unknown;
  price_max?: unknown;
  currency?: unknown;
}): string {
  const priceType = typeof row.price_type === 'string' ? row.price_type : null;
  if (priceType === 'free') return 'Free';
  if (priceType === 'free_with_registration') return 'Free with registration';

  const min = numeric(row.price_min);
  const max = numeric(row.price_max);
  const currency = typeof row.currency === 'string' ? row.currency : null;

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

/**
 * An event image is shown only when the row itself has an https image URL.
 * Stock photos are not substituted.
 */
export function coverImageUrl(row: {
  cover_image_url?: unknown;
}): string | undefined {
  if (
    typeof row.cover_image_url === 'string' &&
    row.cover_image_url.startsWith('https://')
  ) {
    return row.cover_image_url;
  }
  return undefined;
}

export function publicLinkLabel(event: {
  registrationUrl?: string;
  sourceUrl?: string;
}): { title: string; url?: string } {
  const registration = event.registrationUrl?.startsWith('https://')
    ? event.registrationUrl
    : undefined;
  const source = event.sourceUrl?.startsWith('https://')
    ? event.sourceUrl
    : undefined;
  const url = registration ?? source;
  if (!url) return { title: 'No link stated' };

  try {
    const host = new URL(url).host;
    return {
      title: registration ? `Register on ${host}` : `View details on ${host}`,
      url,
    };
  } catch {
    return { title: 'No link stated' };
  }
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatMoney(amount: number, currency: string | null): string {
  const [whole, fraction] = amount.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formatted = fraction === '00' ? grouped : `${grouped}.${fraction}`;
  if (currency === 'XAF' || currency === 'XOF') return `${formatted} FCFA`;
  if (currency) return `${formatted} ${currency}`;
  return formatted;
}
