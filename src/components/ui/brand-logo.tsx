/**
 * BrandLogo
 *
 * The horizontal logo ALWAYS uses the teal-ink version because the teal M mark
 * IS the brand identity — it should be prominent on any background.
 *
 * The mark-only variant also stays teal on both light and dark.
 * The logo text colour adapts: ink on light, white on dark.
 */
import { Image } from 'expo-image';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, useColorScheme, View } from 'react-native';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'horizontal' | 'mark';
  style?: StyleProp<ViewStyle>;
}

// The logo always keeps the teal+ink combination on light and
// teal+white combination on dark. The M mark is always teal.
const LOGO_SOURCE = {
  horizontal: {
    light: require('../../../assets/brand/logo/horizontal/meyalo-horizontal-teal-ink.png'),
    dark: require('../../../assets/brand/logo/horizontal/meyalo-horizontal-white.png'),
  },
  mark: {
    // Mark is always teal — primary brand colour on any theme.
    light: require('../../../assets/brand/mark/meyalo-mark-teal-128.png'),
    dark: require('../../../assets/brand/mark/meyalo-mark-teal-128.png'),
  },
} as const;

const DIMENSIONS = {
  horizontal: {
    sm: { width: 108, height: 28 },
    md: { width: 140, height: 36 },
    lg: { width: 172, height: 44 },
  },
  mark: {
    sm: { width: 28, height: 28 },
    md: { width: 36, height: 36 },
    lg: { width: 44, height: 44 },
  },
} as const;

export function BrandLogo({
  size = 'md',
  variant = 'horizontal',
  style,
}: BrandLogoProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const source = LOGO_SOURCE[variant][isDark ? 'dark' : 'light'];
  const dimensions = DIMENSIONS[variant][size];

  return (
    <View style={[styles.container, dimensions, style]}>
      <Image
        source={source}
        style={styles.image}
        contentFit="contain"
        transition={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
