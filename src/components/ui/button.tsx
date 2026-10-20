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
import { Radius, Spacing, TextStyles } from '@/theme';
import type { ThemeColors } from '@/theme/colors';
import { focusRing } from './focus';
import { Text } from './text';

/**
 * primary: the one main action on a screen · secondary: a quieter filled
 * alternative · outline: a bordered alternative · ghost: a text button.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  title?: string;
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Shows a spinner, keeps the label for screen readers, blocks presses. */
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

interface VariantColors {
  background: string;
  pressed: string;
  label: string;
  border: string;
}

function variantColors(
  variant: ButtonVariant,
  c: ThemeColors,
  disabled: boolean,
): VariantColors {
  if (disabled) {
    const filled = variant === 'primary' || variant === 'secondary';
    return {
      background: filled ? c.actionDisabled : 'transparent',
      pressed: filled ? c.actionDisabled : 'transparent',
      label: c.textMuted,
      border: variant === 'outline' ? c.border : 'transparent',
    };
  }
  switch (variant) {
    case 'primary':
      return {
        background: c.actionPrimary,
        pressed: c.actionPrimaryPressed,
        label: c.onPrimary,
        border: 'transparent',
      };
    case 'secondary':
      return {
        background: c.surfaceSunken,
        pressed: c.backgroundSelected,
        label: c.text,
        border: 'transparent',
      };
    case 'outline':
      return {
        background: 'transparent',
        pressed: c.primarySoft,
        label: c.text,
        border: c.border,
      };
    case 'ghost':
      return {
        background: 'transparent',
        pressed: c.primarySoft,
        label: c.textLink,
        border: 'transparent',
      };
  }
}

const sizeMetrics: Record<
  ButtonSize,
  { minHeight: number; paddingHorizontal: number }
> = {
  small: { minHeight: 36, paddingHorizontal: Spacing.md },
  medium: { minHeight: 48, paddingHorizontal: Spacing.lg },
  large: { minHeight: 52, paddingHorizontal: Spacing.xxl },
};

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
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
  textStyle,
}: ButtonProps) {
  const colors = useTheme();
  const interactive = !disabled && !loading;
  const palette = variantColors(variant, colors, disabled);

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      role="button"
      aria-label={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      aria-disabled={!interactive}
      aria-busy={loading}
      hitSlop={size === 'small' ? 4 : undefined}
      testID={testID}
      style={(state) => [
        styles.base,
        sizeMetrics[size],
        {
          backgroundColor: state.pressed ? palette.pressed : palette.background,
          borderColor: palette.border,
        },
        fullWidth && styles.fullWidth,
        focusRing(state, colors),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.label} />
      ) : (
        <>
          {icon && iconPosition === 'start' ? icon : null}
          {children ?? (
            <Text
              style={[TextStyles.label, { color: palette.label }, textStyle]}
              numberOfLines={2}
              align="center"
            >
              {title}
            </Text>
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
    borderWidth: 1,
    gap: Spacing.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
