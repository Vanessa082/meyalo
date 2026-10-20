/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useContext } from 'react';
import { ForcedSchemeContext } from '@/hooks/forced-scheme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type ThemeColors } from '@/theme/colors';

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  const forced = useContext(ForcedSchemeContext);

  const activeScheme = forced ?? (scheme === 'dark' ? 'dark' : 'light');

  return Colors[activeScheme];
}

export type Theme = ThemeColors;
