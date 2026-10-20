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

export const Layout = {
  /** Horizontal screen padding; wider phones get more room. */
  gutter: 16,
  gutterWide: 20,
  /** Width at which `gutterWide` applies. */
  wideFrom: 380,
  sectionGap: 32,
  /** Reading width for single-column flows on tablets and the web. */
  readableWidth: 560,
} as const;

export const TouchTargets = {
  minimum: 44,
  recommended: 48,
} as const;

export const Dimensions = {
  maxContentWidth: 800,
} as const;
