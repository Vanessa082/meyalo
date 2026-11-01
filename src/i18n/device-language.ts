import { getLocales } from 'expo-localization';

export function getDeviceLanguageCode(): string | null {
  return getLocales()[0]?.languageCode ?? null;
}
