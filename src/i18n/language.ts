export type AppLanguage = 'en' | 'fr';

export const LANGUAGE_STORAGE_KEY = 'meyalo.locale.v1';

/**
 * Resolves the app language.
 * An explicit saved choice wins. Otherwise English devices use English,
 * and French or any other device language uses French.
 */
export function resolveAppLanguage(
  deviceLanguageCode: string | null | undefined,
  explicit: string | null | undefined,
): AppLanguage {
  const saved = parseStoredLanguage(explicit);
  if (saved) return saved;

  const primary = primaryLanguageCode(deviceLanguageCode);
  if (primary === 'en') return 'en';
  return 'fr';
}

export function parseStoredLanguage(
  raw: string | null | undefined,
): AppLanguage | null {
  if (raw === 'en' || raw === 'fr') return raw;
  return null;
}

export function primaryLanguageCode(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const primary = code.trim().toLowerCase().split(/[-_]/)[0];
  return primary || null;
}
