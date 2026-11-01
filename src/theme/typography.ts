import type { TextStyle } from 'react-native';

/**
 * Manrope is loaded per weight by `useFonts` in the root layout. Custom fonts
 * do not synthesise weights on Android, so each weight is its own family and
 * `fontWeight` is never relied on. Headlines use ExtraBold with tight
 * tracking, the signature of the brand (BRAND.md).
 */
export const Fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

export type FontWeightName = keyof typeof Fonts;

export const Families = {
  sans: Fonts.regular,
  mono: 'monospace',
};

export type TextStyleName =
  | 'display'
  | 'title1'
  | 'title2'
  | 'headline'
  | 'body'
  | 'callout'
  | 'label'
  | 'footnote'
  | 'caption';

/**
 * The type scale. 12px is the floor: nothing in the consumer app is smaller.
 * `label` is the interactive variant of `callout` (buttons, chips, tabs).
 */
export const TextStyles: Record<TextStyleName, TextStyle> = {
  display: {
    fontFamily: Fonts.extraBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.2,
  },
  title1: {
    fontFamily: Fonts.extraBold,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.7,
  },
  title2: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  headline: { fontFamily: Fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: Fonts.bold, fontSize: 15, lineHeight: 20 },
  footnote: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
};

/** Older names still read by screens that have not moved to `Text`. */
export const Typography = {
  display: TextStyles.display,
  h1: TextStyles.title1,
  h2: TextStyles.title2,
  h3: TextStyles.title2,
  title: TextStyles.headline,
  bodyLarge: TextStyles.body,
  body: TextStyles.callout,
  bodySmall: TextStyles.footnote,
  label: TextStyles.label,
  caption: TextStyles.caption,
  button: TextStyles.label,
  metadata: TextStyles.caption,
};
