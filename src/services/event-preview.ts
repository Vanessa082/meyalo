import type { EventCardData } from '../types/event.type.ts';
import type { EventCardText } from './event-mapping.ts';

/**
 * What a shared event link shows in WhatsApp, Facebook or search results.
 * Built at deploy time (scripts/build-event-previews.ts) because SDK 57
 * static pages cannot load data while rendering; see docs/environment.md.
 */
export interface EventPreview {
  id: string;
  title: string;
  /** Date, place and price on one line. */
  details: string;
  description: string;
}

export interface MetaTag {
  /** `property` for og:*, `name` for the rest. */
  key: string;
  content: string;
}

const DESCRIPTION_MAX = 200;

function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function toEventPreview(
  event: EventCardData,
  text: Pick<EventCardText, 'dateText' | 'priceLabel'>,
): EventPreview {
  const place =
    event.format === 'virtual'
      ? 'Online'
      : [event.venueName, event.city].filter(Boolean).join(', ');
  return {
    id: event.id,
    title: event.title,
    details: [text.dateText, place, text.priceLabel]
      .filter((part): part is string => Boolean(part))
      .join(' · '),
    description: shorten(event.description ?? '', DESCRIPTION_MAX),
  };
}

/** Tags for <Head>. Absolute URLs only when the public address is known. */
export function previewMeta(
  preview: EventPreview,
  baseUrl: string | undefined,
): MetaTag[] {
  const description = [preview.details, preview.description]
    .filter(Boolean)
    .join('. ');
  const tags: MetaTag[] = [
    { key: 'description', content: description },
    { key: 'og:type', content: 'website' },
    { key: 'og:site_name', content: 'Meyalo' },
    { key: 'og:title', content: preview.title },
    { key: 'og:description', content: description },
    { key: 'twitter:card', content: 'summary_large_image' },
    { key: 'twitter:title', content: preview.title },
    { key: 'twitter:description', content: description },
  ];
  if (baseUrl) {
    const base = baseUrl.replace(/\/$/, '');
    tags.push(
      { key: 'og:url', content: `${base}/event/${preview.id}` },
      { key: 'og:image', content: `${base}/og-default.png` },
      { key: 'og:image:width', content: '1200' },
      { key: 'og:image:height', content: '630' },
      { key: 'twitter:image', content: `${base}/og-default.png` },
    );
  }
  return tags;
}
