import type { AppLanguage } from './language.ts';

/**
 * Resolves a dot-separated key. A missing translation falls back to English,
 * then to the key itself.
 */
export function lookupTranslation(
  catalogs: Record<AppLanguage, unknown>,
  key: string,
  lang: AppLanguage,
): string {
  const direct = readPath(catalogs[lang], key);
  if (direct !== undefined) return direct;

  if (lang !== 'en') {
    const english = readPath(catalogs.en, key);
    if (english !== undefined) return english;
  }

  return key;
}

function readPath(catalog: unknown, key: string): string | undefined {
  let current: unknown = catalog;
  for (const part of key.split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function catalogKeyPaths(catalog: unknown, prefix = ''): string[] {
  if (!catalog || typeof catalog !== 'object') return [];
  const paths: string[] = [];
  for (const [key, value] of Object.entries(catalog)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      paths.push(...catalogKeyPaths(value, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}
