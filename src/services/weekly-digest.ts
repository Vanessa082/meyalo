import { formatDayHeading } from '../i18n/format.ts';
import type { AppLanguage } from '../i18n/language.ts';
import type { EventCardData } from '../types/event.type.ts';
import { eventSpan } from './event-time.ts';
import { DAY_MS, instantToWallTime, zonedDay } from './zoned-time.ts';

/**
 * The weekly WhatsApp Channel post (docs/product-decisions.md, Feature 20):
 * the next 7 days' checked events by day, each with time, place and link.
 * Curators copy it from the console; Channels have no API, so posting is
 * manual. Pure.
 */

/** WhatsApp cuts long posts; stay well under its limit. */
export const DIGEST_MAX = 3500;

interface DigestOptions {
  now: Date;
  i18n: {
    language: AppLanguage;
    t: (key: string, params?: Record<string, string | number>) => string;
  };
  linkFor: (eventId: string) => string;
  timeZone: string;
}

export function weeklyDigest(
  events: readonly EventCardData[],
  { now, i18n, linkFor, timeZone }: DigestOptions,
): string {
  const { t, language } = i18n;
  const until = now.getTime() + 7 * DAY_MS;
  const upcoming = events
    .filter((event) => event.status !== 'cancelled')
    .filter((event) => {
      const { start } = eventSpan(event);
      return start > now.getTime() && start < until;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  const header = [t('digest.title'), t('digest.subtitle'), ''];
  const footer = ['', t('digest.footer')];
  const lines = [...header];
  let currentDay = '';
  let shown = 0;
  for (const event of upcoming) {
    const zone = event.timezone || timeZone;
    const day = zonedDay(event.startsAt, zone);
    const date = day ? new Date(day.date).toISOString().slice(0, 10) : '';
    const block: string[] = [];
    if (date !== currentDay) {
      block.push(...(currentDay ? [''] : []), formatDayHeading(date, language));
    }
    const time = instantToWallTime(event.startsAt, zone).slice(11, 16);
    const place =
      event.format === 'virtual' ? t('eventCard.online') : (event.city ?? '');
    block.push(
      `• ${event.title}, ${[time, place].filter(Boolean).join(', ')}`,
      `  ${linkFor(event.id)}`,
    );
    const more = t('digest.more', { count: upcoming.length - shown - 1 });
    const size = [...lines, ...block, more, ...footer].join('\n').length;
    if (size > DIGEST_MAX) {
      lines.push('', t('digest.more', { count: upcoming.length - shown }));
      break;
    }
    lines.push(...block);
    currentDay = date;
    shown += 1;
  }
  if (shown === 0) lines.push(t('digest.empty'));
  return [...lines, ...footer].join('\n');
}
