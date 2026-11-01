/**
 * BrandLogo
 *
 * Drawn as vector from the SVG masters. The mark sits on the brand gradient
 * tile, exactly like the app icon (owner's decision, 2026-10-20), so the
 * logo in the app, on the web and on the home screen is one image. The
 * wordmark uses `text`. See BRAND.md.
 */
import { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
import { Palette } from '@/theme/colors';
import { MARK_PATH, WORDMARK_PATH } from './brand-paths';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'horizontal' | 'mark';
  style?: StyleProp<ViewStyle>;
}

/** Height in points; the horizontal lockup is 5.2 times as wide. */
const HEIGHT = { sm: 24, md: 30, lg: 38 } as const;
const MARK_SIZE = { sm: 28, md: 36, lg: 44 } as const;

/** Like the app icon (scripts/generate-assets.py): 512 square, mark inset 76. */
const INSET = 76;
const MARK_SCALE = (512 - 2 * INSET) / 512;
const CORNER = 118;

/** The gradient tile with the white mark, in a 512 x 512 box. */
function Tile({ id }: { id: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Palette.brandLight} />
          <Stop offset="1" stopColor={Palette.brandDeep} />
        </LinearGradient>
      </Defs>
      <Rect width={512} height={512} rx={CORNER} fill={`url(#${id})`} />
      <G transform={`translate(${INSET}, ${INSET}) scale(${MARK_SCALE})`}>
        <Path d={MARK_PATH} fill={Palette.white} fillRule="evenodd" />
      </G>
    </>
  );
}

export function BrandLogo({
  size = 'md',
  variant = 'horizontal',
  style,
}: BrandLogoProps) {
  const colors = useTheme();
  // SVG ids must be unique on a web page and cannot contain ":".
  const id = `meyalo-tile-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;

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
          <Tile id={id} />
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
          <Tile id={id} />
        </G>
        <G transform="translate(120, 0)">
          <Path d={WORDMARK_PATH} fill={colors.text} fillRule="evenodd" />
        </G>
      </Svg>
    </View>
  );
}
