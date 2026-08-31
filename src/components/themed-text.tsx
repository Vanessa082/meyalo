import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Families, Typography } from '@/theme';
import type { ThemeColors } from '@/theme/colors';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type TextVariant =
  | 'default'
  | 'body'
  | 'title'
  | 'header'
  | 'h1'
  | 'h2'
  | 'subtitle'
  | 'subhead'
  | 'small'
  | 'smallBold'
  | 'caption'
  | 'captionBold'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextVariant;
  /** Alias for `type` to support callers passing `variant` */
  variant?: TextVariant;
  /** Any semantic color key from the full theme palette. */
  themeColor?: keyof ThemeColors;
};

// ----------------------------------------------------------------------------
// Declarative Lookup Maps (No Switch / If statements)
// ----------------------------------------------------------------------------

const variantStylesMap: Record<TextVariant, TextStyle> = {
  default: Typography.body,
  body: Typography.body,
  title: Typography.title,
  header: Typography.h1,
  h1: Typography.h1,
  h2: Typography.h2,
  subtitle: Typography.h2,
  subhead: Typography.h2,
  small: Typography.bodySmall,
  smallBold: { ...Typography.bodySmall, fontWeight: '700' },
  caption: Typography.bodySmall,
  captionBold: { ...Typography.bodySmall, fontWeight: '700' },
  link: Typography.body,
  linkPrimary: Typography.body,
  code: { ...Typography.body, fontFamily: Families.mono },
};

const accessibilityRoleMap: Record<
  TextVariant,
  TextProps['accessibilityRole']
> = {
  default: 'text',
  body: 'text',
  title: 'header',
  header: 'header',
  h1: 'header',
  h2: 'header',
  subtitle: 'header',
  subhead: 'text',
  small: 'text',
  smallBold: 'text',
  caption: 'text',
  captionBold: 'text',
  link: 'text',
  linkPrimary: 'text',
  code: 'text',
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function ThemedText({
  style,
  type,
  variant,
  themeColor,
  accessibilityRole,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const activeVariant: TextVariant = variant ?? type ?? 'default';

  // Declarative color resolution
  const resolvedColorKey: keyof ThemeColors =
    themeColor ??
    (activeVariant === 'link' || activeVariant === 'linkPrimary'
      ? 'textLink'
      : 'text');

  const typographyStyle = variantStylesMap[activeVariant] ?? Typography.body;
  const computedRole = accessibilityRoleMap[activeVariant] ?? 'text';

  return (
    <Text
      accessibilityRole={accessibilityRole ?? computedRole}
      style={[typographyStyle, { color: theme[resolvedColorKey] }, style]}
      {...rest}
    />
  );
}
