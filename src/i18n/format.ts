import { REGION } from '../config/region.ts';
import type { AppLanguage } from './language.ts';

export const LOCALES: Record<AppLanguage, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
};

/** "October 2026" / "Octobre 2026", in the given timezone. */
export function formatMonthYear(
  date: Date,
  language: AppLanguage,
  timeZone: string = REGION.timeZone,
): string {
  const text = new Intl.DateTimeFormat(LOCALES[language], {
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const JUST_NOW: Record<AppLanguage, string> = {
  en: 'just now',
  fr: "à l'instant",
};

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "5 minutes ago" / "il y a 5 minutes", using the largest whole unit. */
export function formatTimeAgo(
  then: Date,
  now: Date,
  language: AppLanguage,
): string {
  const elapsed = Math.max(0, now.getTime() - then.getTime());
  const format = new Intl.RelativeTimeFormat(LOCALES[language], {
    numeric: 'always',
  });
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return format.format(-Math.floor(elapsed / ms), unit);
  }
  return JUST_NOW[language];
}

/** "Saturday 24 October" for a calendar day given as YYYY-MM-DD. */
export function formatDayHeading(date: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(',', '');
}

/** One-letter weekday names, Monday first (the calendar's week). */
export function weekdayInitials(language: AppLanguage): string[] {
  const format = new Intl.DateTimeFormat(LOCALES[language], {
    weekday: 'narrow',
    timeZone: 'UTC',
  });
  // 5 January 2026 is a Monday.
  return Array.from({ length: 7 }, (_, i) =>
    format.format(new Date(Date.UTC(2026, 0, 5 + i, 12))).toUpperCase(),
  );
}
