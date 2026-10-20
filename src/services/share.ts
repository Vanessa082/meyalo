import type { EventCardData } from '../types/event.type.ts';
import type { EventCardText } from './event-mapping.ts';

export interface ShareLabels {
  online: string;
  venueTbc: string;
  via: string;
}

/**
 * A short, plain message for WhatsApp and other apps: one fact per line so it
 * reads well in a chat bubble, nothing invented when a detail is unknown.
 */
export function buildShareText(
  event: EventCardData,
  text: Pick<EventCardText, 'dateText' | 'priceLabel'>,
  url: string | null,
  labels: ShareLabels,
): string {
  const place =
    event.format === 'virtual'
      ? labels.online
      : [event.venueName, event.city].filter(Boolean).join(', ') ||
        labels.venueTbc;
  return [event.title, text.dateText, place, text.priceLabel, url, labels.via]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

/** Opens WhatsApp (app or web) with the text ready to send to any chat. */
export function whatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
