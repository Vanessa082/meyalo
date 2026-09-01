import { supabase } from '@/lib/supabase';
import type { EventCardData } from '@/types/event.type';

/**
 * Maps a raw Supabase `events` row to the app's EventCardData shape.
 *
 * This is the single source of truth for DB → UI column mapping.
 * If the schema changes, update this function only.
 */
function mapRowToEventCard(row: Record<string, unknown>): EventCardData {
  const startAt = row.start_at as string | null;
  const city = (row.city as string) ?? '';
  const format = row.format as string;
  const isVerified = row.is_verified as boolean;
  const lastChecked = row.last_checked_at as string | null;

  return {
    id: row.id as string,
    slug: slugify(row.title as string),
    title: row.title as string,
    organizerName: (row.organizer_name as string) ?? 'Unknown organizer',
    eventType: (row.category as string) ?? 'Event',
    primaryCategory: (row.category as string) ?? '',
    startsAt: startAt ?? new Date().toISOString(),
    endsAt: (row.end_at as string) ?? undefined,
    timezone: 'WAT',
    format: mapFormat(format),
    venueName: (row.venue_name as string) ?? undefined,
    city: city || undefined,
    priceType: 'free',
    priceLabel: 'Free',
    coverImageUrl: getCoverImage(row.category as string),
    status: 'scheduled',
    trustLabel: buildTrustLabel(isVerified, row.source_url as string),
    lastCheckedAt: lastChecked ?? undefined,
    verificationText: buildVerificationText(isVerified, lastChecked),
    sourceUrl: (row.source_url as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    dateFormatted: formatEventDate(startAt),
    dateBadgeText: buildDateBadge(startAt),
    distanceText: undefined,
    distanceKm: undefined,
  };
}

/**
 * Maps DB format string to EventCardData format union.
 */
function mapFormat(format: string): 'in_person' | 'virtual' | 'hybrid' {
  if (format === 'physical') return 'in_person';
  if (format === 'hybrid') return 'hybrid';
  return 'virtual';
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
 * Builds an evidence-based trust label (Blueprint Section 8).
 * No generic "Verified" — only evidence-backed claims.
 */
function buildTrustLabel(
  isVerified: boolean,
  sourceUrl: string | null,
): string {
  if (!sourceUrl) return 'Community-submitted';
  if (isVerified) return 'Official source';
  return 'Source available';
}

/**
 * Builds verification text with last-checked timestamp.
 */
function buildVerificationText(
  isVerified: boolean,
  lastChecked: string | null,
): string {
  const sourceLabel = isVerified ? 'Official source' : 'Source available';
  if (!lastChecked) return sourceLabel;

  const checkedDate = new Date(lastChecked);
  const now = new Date();
  const diffMs = now.getTime() - checkedDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  let timeAgo: string;
  if (diffHours < 1) timeAgo = 'just now';
  else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
  else timeAgo = `${Math.floor(diffHours / 24)}d ago`;

  return `${sourceLabel} · Checked ${timeAgo}`;
}

/**
 * Formats a date string to a human-readable event date.
 */
function formatEventDate(startsAt: string | null): string {
  if (!startsAt) return 'Date TBD';
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
  if (!startsAt) return 'TBD';
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

/**
 * Returns a category-appropriate cover image URL.
 */
function getCoverImage(category: string | null): string {
  const cat = (category ?? '').toLowerCase();
  if (cat.includes('business') || cat.includes('finance'))
    return 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=600&auto=format&fit=crop&q=80';
  if (
    cat.includes('tech') ||
    cat.includes('software') ||
    cat.includes('engineering')
  )
    return 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80';
  if (cat.includes('career'))
    return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80';
  if (cat.includes('agri') || cat.includes('trade'))
    return 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&auto=format&fit=crop&q=80';
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

// Re-export for backward compatibility with existing imports
export const DEMO_FALLBACK_EVENTS: EventCardData[] = [];
