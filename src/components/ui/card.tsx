import type { ReactNode } from 'react';
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Shadows, Spacing } from '@/theme';
import type { ThemeColors } from '@/theme/colors';

export type CardVariant = 'flat' | 'elevated' | 'outlined';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  /** Content rendered inside the card container */
  children: ReactNode;
  /** Visual surface variant */
  variant?: CardVariant;
  /** Inner padding scale */
  padding?: CardPadding;
  /** Optional press handler for interactive cards */
  onPress?: () => void;
  /** Additional custom container styles */
  style?: StyleProp<ViewStyle>;
}

const paddingMap: Record<CardPadding, number> = {
  none: Spacing.none,
  sm: Spacing.sm, // 8
  md: Spacing.lg, // 16
  lg: Spacing.xxl, // 24
};

const backgroundKeyMap: Record<CardVariant, keyof ThemeColors> = {
  elevated: 'elevated',
  flat: 'surface',
  outlined: 'surface',
};

const borderWidthMap: Record<CardVariant, number> = {
  elevated: 0,
  flat: 0,
  outlined: 1,
};

/**
 * Card Surface Primitive
 *
 * Theme-aware container component that standardizes surface background colors,
 * borders, shadows, and rounded corners across all card surfaces in Meyalo.
 */
export function Card({
  children,
  variant = 'outlined',
  padding = 'md',
  onPress,
  style,
}: CardProps) {
  const colors = useTheme();
  const scheme = useColorScheme() ?? 'light';

  const backgroundColor = colors[backgroundKeyMap[variant] ?? 'surface'];
  const borderColor = variant === 'outlined' ? colors.border : 'transparent';
  const borderWidth = borderWidthMap[variant] ?? 0;
  const paddingValue = paddingMap[padding] ?? paddingMap.md;
  const shadowStyle =
    variant === 'elevated'
      ? Shadows[scheme === 'dark' ? 'dark' : 'light'].low
      : undefined;

  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor,
      borderColor,
      borderWidth,
      padding: paddingValue,
    },
    shadowStyle,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
});
