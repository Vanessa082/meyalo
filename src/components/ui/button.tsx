import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, TouchTargets, Typography } from '@/theme';
import type { ThemeColors } from '@/theme/colors';
import { ThemeText } from './theme-text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  /** Text label displayed inside the button */
  title?: string;
  /** Custom children (rendered instead of title if provided) */
  children?: ReactNode;
  /** Press handler */
  onPress?: () => void;
  /** Visual hierarchy variant */
  variant?: ButtonVariant;
  /** Size scale */
  size?: ButtonSize;
  /** Disables touch interactions and updates visuals */
  disabled?: boolean;
  /** Displays a loading spinner and disables touch interactions */
  loading?: boolean;
  /** Optional icon element */
  icon?: ReactNode;
  /** Placement of icon relative to label text */
  iconPosition?: 'start' | 'end';
  /** Stretches button across available width */
  fullWidth?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Additional text label styles */
  textStyle?: StyleProp<TextStyle>;
}

// ----------------------------------------------------------------------------
// Declarative Lookup Maps (Advanced Record Pattern)
// ----------------------------------------------------------------------------

const variantBackgroundResolvers: Record<
  ButtonVariant,
  (colors: ThemeColors, pressed: boolean) => string
> = {
  primary: (c, pressed) => (pressed ? c.primaryPressed : c.actionPrimary),
  secondary: (c, pressed) =>
    pressed ? c.backgroundSelected : c.surfaceSecondary,
  outline: (c, pressed) => (pressed ? c.primarySoft : 'transparent'),
  ghost: (c, pressed) => (pressed ? c.primarySoft : 'transparent'),
};

const variantTextColorMap: Record<ButtonVariant, keyof ThemeColors> = {
  primary: 'textInverse',
  secondary: 'text',
  outline: 'primary',
  ghost: 'primary',
};

const sizeMetricsMap: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number }
> = {
  small: {
    height: 36,
    paddingHorizontal: Spacing.sm,
  },
  medium: {
    height: TouchTargets.recommended, // 48px
    paddingHorizontal: Spacing.lg,
  },
  large: {
    height: 56,
    paddingHorizontal: Spacing.xxl,
  },
};

/**
 * Button Primitive
 *
 * Theme-aware, accessible interactive button supporting multiple variants,
 * sizes, loading spinners, and icon positions.
 */
export function Button({
  title,
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'start',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const colors = useTheme();
  const isInteractive = !disabled && !loading;

  // Resolve border color
  const borderColor = disabled
    ? colors.actionDisabled
    : variant === 'outline'
      ? colors.borderStrong
      : 'transparent';

  // Resolve label color
  const textColorKey = disabled
    ? 'textMuted'
    : (variantTextColorMap[variant] ?? 'textInverse');

  const sizeMetrics = sizeMetricsMap[size] ?? sizeMetricsMap.medium;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        sizeMetrics,
        {
          backgroundColor: disabled
            ? colors.actionDisabled
            : (
                variantBackgroundResolvers[variant] ??
                variantBackgroundResolvers.primary
              )(colors, pressed),
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors[textColorKey]} />
      ) : (
        <>
          {icon && iconPosition === 'start' ? icon : null}
          {children ? (
            children
          ) : (
            <ThemeText
              style={[
                Typography.button,
                { color: colors[textColorKey] },
                textStyle,
              ]}
            >
              {title}
            </ThemeText>
          )}
          {icon && iconPosition === 'end' ? icon : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.button,
    gap: Spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
});
