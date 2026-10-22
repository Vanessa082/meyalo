import { OTHER_CITIES, QUICK_PICK_CITIES } from '../config/discovery/cities.ts';
import type { EventCardData } from '../types/event.type.ts';
import { eventSpan } from './event-time.ts';
import { samePlace } from './geo.ts';
import { zonedDay } from './zoned-time.ts';

/**
 * Website event lists and search files (docs/product-decisions.md, Feature
 * 20). Built at deploy time from the published events, like the link
 * previews; pure so the build script stays thin.
 */

export interface ListingItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string | null;
  format: EventCardData['format'];
  city: string | null;
  /** A launch city from config/discovery/cities.ts, null online or unknown. */
  cityId: string | null;
  category: string;
}

const CITIES = [...QUICK_PICK_CITIES, ...OTHER_CITIES];

export function toListingItem(event: EventCardData): ListingItem {
  const city =
    event.format !== 'virtual' && event.city
      ? CITIES.find((known) => samePlace(known.name, event.city as string))
      : undefined;
  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt ?? null,
    timezone: event.timezone || null,
    format: event.format,
    city: event.city ?? null,
    cityId: city?.id ?? null,
    category: event.primaryCategory,
  };
}

/** Events that have not started, grouped by their local day, soonest first. */
export function upcomingByDay(
  items: readonly ListingItem[],
  now: Date,
  regionTimeZone: string,
): { date: string; items: ListingItem[] }[] {
  const days = new Map<string, ListingItem[]>();
  const upcoming = items
    .filter(
      (item) =>
        eventSpan({ startsAt: item.startsAt, endsAt: item.endsAt ?? undefined })
          .start > now.getTime(),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  for (const item of upcoming) {
    const day = zonedDay(item.startsAt, item.timezone || regionTimeZone);
    if (!day) continue;
    const date = new Date(day.date).toISOString().slice(0, 10);
    days.set(date, [...(days.get(date) ?? []), item]);
  }
  return [...days.entries()].map(([date, list]) => ({ date, items: list }));
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Every public page search engines should know; never private ones. */
export function buildSitemap(
  baseUrl: string,
  pages: { cityIds: readonly string[]; eventIds: readonly string[] },
): string {
  const paths = [
    '/',
    '/events',
    ...pages.cityIds.map((id) => `/events/${id}`),
    ...pages.eventIds.map((id) => `/event/${id}`),
    '/how-we-verify',
    '/submit',
    '/privacy',
    '/terms',
  ];
  const urls = paths
    .map((path) => `  <url><loc>${escapeXml(`${baseUrl}${path}`)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Private pages: friends' plan links, the console, sign-in, settings. */
export const PRIVATE_PATHS = [
  '/plan/',
  '/console',
  '/sign-in',
  '/verify',
  '/privacy-settings',
] as const;

export function buildRobots(baseUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
}
