import type { AppLanguage } from '@/i18n/language';
import en from './messages/en.json';
import fr from './messages/fr.json';
import { lookupTranslation } from './translate';

export type Language = AppLanguage;

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
 * Safely resolves a dot-separated translation key path for a given language.
 * Falls back to English if the translation is missing in the target language.
 */
export function t(
  key: TxKeyPath,
  lang: Language = getActiveLanguage(),
): string {
  return lookupTranslation(translations, key, lang);
}
