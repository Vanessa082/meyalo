import type { AppLanguage } from '@/i18n/language';
import en from './messages/en.json';
import fr from './messages/fr.json';
import {
  interpolate,
  lookupTranslation,
  type TranslationParams,
} from './translate';

export type Language = AppLanguage;
export type { TranslationParams };

let activeLanguage: AppLanguage = 'fr';

export function setActiveLanguage(language: AppLanguage): void {
  activeLanguage = language;
}

export function getActiveLanguage(): AppLanguage {
  return activeLanguage;
}

const translations = { en, fr };

/**
 * Recursive TypeScript type that extracts dot-notation paths from nested JSON objects.
 * e.g. { tabs: { forYou: "..." } } → "tabs.forYou"
 */
type NestedKeyOf<T extends object> = {
  [K in keyof T & string]: T[K] extends object
    ? `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`;
}[keyof T & string];

export type TxKeyPath = NestedKeyOf<typeof en>;

/**
 * Resolves a translation in the given language, falling back to English.
 * Components should prefer `useTranslation()` so they re-render when the
 * language changes.
 */
export function translate(
  key: TxKeyPath,
  params?: TranslationParams,
  lang: Language = getActiveLanguage(),
): string {
  return interpolate(lookupTranslation(translations, key, lang), params);
}

export function t(key: TxKeyPath, params?: TranslationParams): string {
  return translate(key, params);
}
