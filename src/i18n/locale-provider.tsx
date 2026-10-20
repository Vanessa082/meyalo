import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  setActiveLanguage,
  type TranslationParams,
  type TxKeyPath,
  translate,
} from '@/i18n';
import { getDeviceLanguageCode } from '@/i18n/device-language';
import { type AppLanguage, resolveAppLanguage } from '@/i18n/language';
import {
  readExplicitLanguage,
  writeExplicitLanguage,
} from '@/i18n/language-store';
import { deviceStorage } from '@/lib/device-storage';

interface LocaleContextValue {
  language: AppLanguage;
  setExplicitLanguage: (language: AppLanguage) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [explicit, setExplicit] = useState<AppLanguage | null>(null);
  const language = resolveAppLanguage(getDeviceLanguageCode(), explicit);

  setActiveLanguage(language);

  useEffect(() => {
    let cancelled = false;
    readExplicitLanguage(deviceStorage).then((stored) => {
      if (cancelled) return;
      if (stored) setExplicit(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setExplicitLanguage = useCallback(async (next: AppLanguage) => {
    setExplicit(next);
    await writeExplicitLanguage(deviceStorage, next);
  }, []);

  return (
    <LocaleContext.Provider value={{ language, setExplicitLanguage }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useAppLanguage(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error('useAppLanguage must be used within LocaleProvider');
  }
  return value;
}

export interface TranslationApi {
  t: (key: TxKeyPath, params?: TranslationParams) => string;
  language: AppLanguage;
}

export function useTranslation(): TranslationApi {
  const { language } = useAppLanguage();
  const bound = useCallback(
    (key: TxKeyPath, params?: TranslationParams) =>
      translate(key, params, language),
    [language],
  );
  return { t: bound, language };
}
