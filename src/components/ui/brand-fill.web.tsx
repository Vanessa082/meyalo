import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

/**
 * Web: a CSS gradient from the theme's CSS variables, so it follows light
 * and dark mode without script (theme/css-vars.ts). See brand-fill.tsx.
 */
export function BrandFill({ pressed = false }: { pressed?: boolean }) {
  const colors = useTheme();
  const gradient = {
    backgroundImage: `linear-gradient(180deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
  } as ViewStyle;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, gradient, pressed && styles.pressed]}
    />
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
});
