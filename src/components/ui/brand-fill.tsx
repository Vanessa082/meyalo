import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

/**
 * The brand gradient behind a filled surface (owner's decision, 2026-10-20):
 * top to bottom, gradientStart to gradientEnd. The parent keeps its solid
 * brand colour underneath and clips this layer (overflow hidden); pressing
 * lets the deeper colour show through.
 */
export function BrandFill({ pressed = false }: { pressed?: boolean }) {
  const colors = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={[StyleSheet.absoluteFill, pressed && styles.pressed]}
    />
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
});
