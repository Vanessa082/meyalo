import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import {
  Fonts,
  type FontWeightName,
  type TextStyleName,
  TextStyles,
} from '@/theme/typography';

export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'primary'
  | 'warning'
  | 'error'
  | 'onPrimary';

export interface TextProps extends RNTextProps {
  variant?: TextStyleName;
  tone?: TextTone;
  weight?: FontWeightName;
  /** Tabular figures, for dates, prices and distances that line up. */
  numeric?: boolean;
  align?: TextStyle['textAlign'];
}

const toneColor = {
  default: 'text',
  secondary: 'textSecondary',
  muted: 'textMuted',
  primary: 'textLink',
  warning: 'warningText',
  error: 'error',
  onPrimary: 'onPrimary',
} as const;

export function Text({
  variant = 'body',
  tone = 'default',
  weight,
  numeric,
  align,
  style,
  ...rest
}: TextProps) {
  const colors = useTheme();
  return (
    <RNText
      style={[
        TextStyles[variant],
        { color: colors[toneColor[tone]] },
        weight && { fontFamily: Fonts[weight] },
        numeric && { fontVariant: ['tabular-nums'] },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
