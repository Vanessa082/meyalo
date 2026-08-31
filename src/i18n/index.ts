import en from './messages/en.json';
import fr from './messages/fr.json';

export type Language = 'en' | 'fr';

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
export function t(key: TxKeyPath, lang: Language = 'en'): string {
  const keys = key.split('.');

  // 1. Try target language lookup
  let currentTarget: unknown = translations[lang];
  for (const k of keys) {
    if (
      currentTarget &&
      typeof currentTarget === 'object' &&
      k in (currentTarget as Record<string, unknown>)
    ) {
      currentTarget = (currentTarget as Record<string, unknown>)[k];
    } else {
      currentTarget = undefined;
      break;
    }
  }

  if (typeof currentTarget === 'string') {
    return currentTarget;
  }

  // 2. Fallback to English lookup
  let currentEn: unknown = translations.en;
  for (const k of keys) {
    if (
      currentEn &&
      typeof currentEn === 'object' &&
      k in (currentEn as Record<string, unknown>)
    ) {
      currentEn = (currentEn as Record<string, unknown>)[k];
    } else {
      currentEn = undefined;
      break;
    }
  }

  if (typeof currentEn === 'string') {
    return currentEn;
  }

  // 3. Fallback: return raw key string
  return key;
}
