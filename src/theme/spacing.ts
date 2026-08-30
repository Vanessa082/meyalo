export const Spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  xxxxxl: 48,
  layoutPage: 16,
  layoutCard: 12,
} as const;

export const TouchTargets = {
  minimum: 44, // Apple HIG min touch target
  recommended: 48, // Material design min touch target
} as const;

export const Dimensions = {
  maxContentWidth: 800,
} as const;
