import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { setActiveLanguage } from '@/i18n';
import { getDeviceLanguageCode } from '@/i18n/device-language';
import { type AppLanguage, resolveAppLanguage } from '@/i18n/language';
import {
  readExplicitLanguage,
  writeExplicitLanguage,
} from '@/i18n/language-store';

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
    readExplicitLanguage(AsyncStorage).then((stored) => {
      if (cancelled) return;
      if (stored) setExplicit(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setExplicitLanguage = useCallback(async (next: AppLanguage) => {
    setExplicit(next);
    await writeExplicitLanguage(AsyncStorage, next);
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
