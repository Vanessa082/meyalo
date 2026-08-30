/**
 * Meyalo Legacy Theme Adapter
 * Re-exports the unified theme system for backward compatibility with existing views.
 */

import '@/global.css';
import { Platform } from 'react-native';
import { Colors as NewColors, Families, Spacing as NewSpacing } from '../theme';

export const Colors = {
  light: {
    text: NewColors.light.text,
    background: NewColors.light.background,
    backgroundElement: NewColors.light.backgroundElement,
    backgroundSelected: NewColors.light.backgroundSelected,
    textSecondary: NewColors.light.textSecondary,
  },
  dark: {
    text: NewColors.dark.text,
    background: NewColors.dark.background,
    backgroundElement: NewColors.dark.backgroundElement,
    backgroundSelected: NewColors.dark.backgroundSelected,
    textSecondary: NewColors.dark.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Families;

export const Spacing = {
  half: NewSpacing.xxs,   // 2px
  one: NewSpacing.xs,     // 4px
  two: NewSpacing.sm,     // 8px
  three: NewSpacing.lg,   // 16px
  four: NewSpacing.xxl,   // 24px
  five: NewSpacing.xxxl,  // 32px
  six: 64,                // 64px
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
export { Theme } from '../theme';
export type { AppTheme } from '../theme';
