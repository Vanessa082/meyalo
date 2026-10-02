import { supabase } from '@/lib/supabase';
import {
  buildPriceLabel,
  buildTrustLabel,
  buildVerificationText,
  coverImageUrl,
  mapFormat,
  verificationState,
} from '@/services/event-mapping';
import type { EventCardData, PriceType } from '@/types/event.type';

/**
 * Maps a raw Supabase `events` row to the app's EventCardData shape.
 *
 * This is the single source of truth for DB → UI column mapping.
 * If the schema changes, update this function only.
 */
function mapRowToEventCard(row: Record<string, unknown>): EventCardData {
  const startAt = typeof row.start_at === 'string' ? row.start_at : null;
  const city = typeof row.city === 'string' ? row.city : undefined;
  const state = verificationState(row);
  const lastChecked =
    typeof row.last_checked_at === 'string' ? row.last_checked_at : null;
  const priceType = priceTypeOf(row.price_type);
  const publication = row.publication_status;

  return {
    id: row.id as string,
    slug: slugify(typeof row.title === 'string' ? row.title : ''),
    title: typeof row.title === 'string' ? row.title : '',
    organizerName:
      typeof row.organizer_name === 'string' && row.organizer_name.trim()
        ? row.organizer_name
        : 'Organizer not stated',
    eventType: typeof row.category === 'string' ? row.category : '',
    primaryCategory: typeof row.category === 'string' ? row.category : '',
    startsAt: startAt ?? '',
    endsAt: typeof row.end_at === 'string' ? row.end_at : undefined,
    timezone: typeof row.timezone === 'string' ? row.timezone : '',
    format: mapFormat(typeof row.format === 'string' ? row.format : ''),
    venueName: typeof row.venue_name === 'string' ? row.venue_name : undefined,
    city,
    priceType,
    priceLabel: buildPriceLabel(row),
    coverImageUrl: coverImageUrl(row),
    registrationUrl:
      typeof row.registration_url === 'string'
        ? row.registration_url
        : undefined,
    status:
      publication === 'cancelled'
        ? 'cancelled'
        : publication === 'ended'
          ? 'completed'
          : 'scheduled',
    verificationState: state,
    trustLabel: buildTrustLabel(state),
    lastCheckedAt: lastChecked ?? undefined,
    verificationText: buildVerificationText(state, lastChecked),
    sourceUrl: typeof row.source_url === 'string' ? row.source_url : undefined,
    description:
      typeof row.description === 'string' ? row.description : undefined,
    dateFormatted: formatEventDate(startAt),
    dateBadgeText: buildDateBadge(startAt),
    distanceText: undefined,
    distanceKm: undefined,
  };
}

function priceTypeOf(value: unknown): PriceType {
  if (
    value === 'free' ||
    value === 'paid' ||
    value === 'free_with_registration' ||
    value === 'variable' ||
    value === 'unknown'
  ) {
    return value;
  }
  return 'unknown';
}

/**
 * Generates a URL-safe slug from a title.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Formats a date string to a human-readable event date.
 */
function formatEventDate(startsAt: string | null): string {
  if (!startsAt) return 'Date not stated';
  try {
    const date = new Date(startsAt);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
    const day = days[date.getDay()];
    const dd = date.getDate();
    const mon = months[date.getMonth()];
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${day}, ${dd} ${mon} · ${h12}:${minutes} ${ampm}`;
  } catch {
    return 'Date TBD';
  }
}

/**
 * Builds a short date badge like "TODAY", "TOMORROW", or "SEP 05".
 */
function buildDateBadge(startsAt: string | null): string {
  if (!startsAt) return '';
  try {
    const eventDate = new Date(startsAt);
    const now = new Date();

    const eventDay = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
    );
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round(
      (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'TOMORROW';

    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    return `${months[eventDate.getMonth()]} ${eventDate.getDate().toString().padStart(2, '0')}`;
  } catch {
    return 'TBD';
  }
}

// ── Public API ──

export const EventService = {
  /**
   * Fetches live events from Supabase, mapped to EventCardData.
   * Returns empty array on failure — no more silent fallback to fake data.
   */
  async fetchForYouEvents(): Promise<EventCardData[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });

      if (error) {
        console.warn('[EventService] Supabase error:', error.message);
        return [];
      }

      if (!data || data.length === 0) return [];

      return data.map(mapRowToEventCard);
    } catch (err) {
      console.warn('[EventService] Fetch failed:', err);
      return [];
    }
  },

  /**
   * Fetches a single event by ID from Supabase.
   */
  async fetchEventById(id: string): Promise<EventCardData | null> {
    if (!id) return null;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;

      return mapRowToEventCard(data);
    } catch {
      return null;
    }
  },

  /**
   * Searches events by keyword (title or description).
   */
  async searchEvents(query: string): Promise<EventCardData[]> {
    if (!query || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(
          `title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`,
        )
        .order('start_at', { ascending: true });

      if (error || !data) return [];

      return data.map(mapRowToEventCard);
    } catch {
      return [];
    }
  },
};
