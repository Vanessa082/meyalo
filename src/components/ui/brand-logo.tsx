/**
 * BrandLogo
 *
 * Drawn as vector from the SVG masters, in theme colours: the mark uses
 * `brandMark` (brand on light, brandBright on dark) and the wordmark uses `text`, so
 * the logo is sharp at every size and never washed out. See BRAND.md.
 */
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
import { MARK_PATH, WORDMARK_PATH } from './brand-paths';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'horizontal' | 'mark';
  style?: StyleProp<ViewStyle>;
}

/** Height in points; the horizontal lockup is 5.2 times as wide. */
const HEIGHT = { sm: 24, md: 30, lg: 38 } as const;
const MARK_SIZE = { sm: 28, md: 36, lg: 44 } as const;

export function BrandLogo({
  size = 'md',
  variant = 'horizontal',
  style,
}: BrandLogoProps) {
  const colors = useTheme();

  if (variant === 'mark') {
    const side = MARK_SIZE[size];
    return (
      <View
        style={style}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Meyalo"
      >
        <Svg width={side} height={side} viewBox="0 0 512 512">
          <Path d={MARK_PATH} fill={colors.brandMark} fillRule="evenodd" />
        </Svg>
      </View>
    );
  }

  const height = HEIGHT[size];
  return (
    <View
      style={style}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Meyalo"
    >
      <Svg width={height * 5.2} height={height} viewBox="0 0 520 100">
        <G transform="scale(0.1953125)">
          <Path d={MARK_PATH} fill={colors.brandMark} fillRule="evenodd" />
        </G>
        <G transform="translate(120, 0)">
          <Path d={WORDMARK_PATH} fill={colors.text} fillRule="evenodd" />
        </G>
      </Svg>
    </View>
  );
}
