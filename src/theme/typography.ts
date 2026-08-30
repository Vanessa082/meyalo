import { Platform } from 'react-native';

export const Families = {
  // Use Inter as primary font family, falling back to system default
  sans: Platform.select({
    ios: 'Inter',
    android: 'Inter',
    web: 'Inter, system-ui, -apple-system, sans-serif',
    default: 'normal',
  }),
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    web: 'Georgia, serif',
    default: 'serif',
  }),
  mono: Platform.select({
    ios: 'Courier New',
    android: 'monospace',
    web: 'monospace',
    default: 'monospace',
  }),
};

export const Sizes = {
  display: 36,
  h1: 30,
  h2: 24,
  h3: 20,
  title: 18,
  bodyLarge: 16,
  body: 14,
  bodySmall: 12,
  label: 14,
  caption: 11,
  metadata: 10,
};

export const Weights = {
  bold: '700' as const,
  semiBold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
  light: '300' as const,
};

export const LineHeights = {
  display: 44,
  h1: 38,
  h2: 32,
  h3: 26,
  title: 24,
  bodyLarge: 22,
  body: 20,
  bodySmall: 16,
  label: 20,
  caption: 14,
  metadata: 12,
};

export const Typography = {
  display: {
    fontFamily: Families.sans,
    fontSize: Sizes.display,
    fontWeight: Weights.bold,
    lineHeight: LineHeights.display,
  },
  h1: {
    fontFamily: Families.sans,
    fontSize: Sizes.h1,
    fontWeight: Weights.bold,
    lineHeight: LineHeights.h1,
  },
  h2: {
    fontFamily: Families.sans,
    fontSize: Sizes.h2,
    fontWeight: Weights.semiBold,
    lineHeight: LineHeights.h2,
  },
  h3: {
    fontFamily: Families.sans,
    fontSize: Sizes.h3,
    fontWeight: Weights.semiBold,
    lineHeight: LineHeights.h3,
  },
  title: {
    fontFamily: Families.sans,
    fontSize: Sizes.title,
    fontWeight: Weights.medium,
    lineHeight: LineHeights.title,
  },
  bodyLarge: {
    fontFamily: Families.sans,
    fontSize: Sizes.bodyLarge,
    fontWeight: Weights.regular,
    lineHeight: LineHeights.bodyLarge,
  },
  body: {
    fontFamily: Families.sans,
    fontSize: Sizes.body,
    fontWeight: Weights.regular,
    lineHeight: LineHeights.body,
  },
  bodySmall: {
    fontFamily: Families.sans,
    fontSize: Sizes.bodySmall,
    fontWeight: Weights.regular,
    lineHeight: LineHeights.bodySmall,
  },
  label: {
    fontFamily: Families.sans,
    fontSize: Sizes.label,
    fontWeight: Weights.medium,
    lineHeight: LineHeights.label,
  },
  caption: {
    fontFamily: Families.sans,
    fontSize: Sizes.caption,
    fontWeight: Weights.regular,
    lineHeight: LineHeights.caption,
  },
  button: {
    fontFamily: Families.sans,
    fontSize: Sizes.body,
    fontWeight: Weights.semiBold,
    lineHeight: LineHeights.body,
  },
  metadata: {
    fontFamily: Families.sans,
    fontSize: Sizes.metadata,
    fontWeight: Weights.regular,
    lineHeight: LineHeights.metadata,
  },
};
