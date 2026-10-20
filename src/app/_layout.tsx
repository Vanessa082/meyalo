import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { AccountSyncProvider } from '@/components/account/account-sync-provider';
import { RemindersProvider } from '@/components/privacy/reminders-provider';
import { ToastProvider } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { LocaleProvider } from '@/i18n/locale-provider';
import { DataProvider } from '@/lib/data-provider';

SplashScreen.preventAutoHideAsync();
// A short fade into the first screen instead of a cut (iOS; Android uses the
// duration only). The splash colours match the app backgrounds.
SplashScreen.setOptions({ duration: 250, fade: true });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useTheme();

  // Navigation's own surfaces use our colours. On the web those are CSS
  // variables that follow the scheme themselves, so the base is fixed there:
  // choosing it from the live scheme would flip the page after loading.
  const base =
    Platform.OS !== 'web' && colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Native keeps the splash screen up until fonts are ready. Web renders at
  // once: the static export must contain the page (search engines and link
  // previews read the HTML), and the browser swaps the font in when it loads.
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') {
    return null;
  }

  return (
    <LocaleProvider>
      <DataProvider>
        <ThemeProvider value={navigationTheme}>
          <ToastProvider>
            <AccountSyncProvider>
              <RemindersProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                  }}
                />
              </RemindersProvider>
            </AccountSyncProvider>
          </ToastProvider>
        </ThemeProvider>
      </DataProvider>
    </LocaleProvider>
  );
}
