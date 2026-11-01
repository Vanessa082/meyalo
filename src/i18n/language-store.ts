import {
  type AppLanguage,
  LANGUAGE_STORAGE_KEY,
  parseStoredLanguage,
} from './language.ts';

export interface LanguageStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export async function readExplicitLanguage(
  store: LanguageStore,
): Promise<AppLanguage | null> {
  try {
    const raw = await store.getItem(LANGUAGE_STORAGE_KEY);
    return parseStoredLanguage(raw);
  } catch {
    return null;
  }
}

export async function writeExplicitLanguage(
  store: LanguageStore,
  language: AppLanguage,
): Promise<void> {
  await store.setItem(LANGUAGE_STORAGE_KEY, language);
}
