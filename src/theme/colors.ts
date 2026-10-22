export const Palette = {
  // Black, white and one brand colour: blue (owner's decision, 2026-10-19,
  // "like Meta's apps"). Change the brand here; names stay. See BRAND.md.
  // Brighter blue with a gradient on filled surfaces (owner's decision,
  // 2026-10-20): #0866FF to #0055D4; white text passes on both ends.
  /** Solid brand for text, icons and outlines: 4.8:1 or more on white, the
   *  soft tint and the canvas. */
  brand: '#075EEB',
  /** The gradient on filled brand surfaces, top to bottom. */
  brandLight: '#0866FF',
  brandDeep: '#0055D4',
  brandPressed: '#0049B8',
  brandSoft: '#E8F0FE',
  /** The brand lightened to read on the dark theme (5.4:1 or more on every
   *  dark surface). */
  brandBright: '#5B9BFF',
  /** Top of the dark-theme gradient, with ink text (7.7:1 or more). */
  brandBrightLight: '#7AB2FF',
  brandBrightPressed: '#4C8DF6',
  /** Neutral near-black: text on light, background on dark, app icon. */
  ink: '#111312',
  inkRaised: '#1B1D1C',
  inkHigh: '#242625',
  /** Light text on dark, and the lightest neutral surface. */
  canvas: '#F5F5F5',
  /** Neutral greys, no tint. */
  gray100: '#F0F0F0',
  gray200: '#E4E4E4',
  gray300: '#D9D9D9',
  gray700: '#3A3B3B',
  white: '#FFFFFF',
  // Status.
  amber: '#C76A10',
  amberText: '#9A4F08',
  amberSoft: '#FBF0E4',
  amberLight: '#F2A65A',
  critical: '#B42318',
  criticalSoft: '#FDECEA',
  criticalLight: '#FDA29B',
  grayMutedLight: '#5E6160',
  grayMutedDark: '#A3A7A4',
} as const;

/**
 * Semantic colour roles. Text roles are checked against their backgrounds in
 * contrast.test.ts; add a pair there when adding a text role.
 *
 * The brand colour (blue) is the action and selection colour. On light,
 * buttons and selected chips are brand with white text, and it carries links
 * and accents. On dark, the brand is too dark to read on ink, so brandBright
 * takes those roles, with ink text on its fills. Highlights (why an event was
 * picked, the verified badge) use the same colour: one brand colour,
 * everything else black, white and grey. Amber marks time-sensitive or
 * changed information, critical marks errors and cancellations. Status is
 * never carried by colour alone.
 */
export const Colors = {
  light: {
    primary: Palette.brand,
    primaryPressed: Palette.brandPressed,
    primarySoft: Palette.brandSoft,
    /** Text on `actionPrimary` (the brand button). */
    onPrimary: Palette.white,
    /** Any selected chip, segment or filter: a brand pill. */
    selected: Palette.brand,
    onSelected: Palette.white,
    /** Filled brand surfaces (buttons, selected chips): a top-to-bottom
     *  gradient. Solid `primary` stays for text, icons and outlines. */
    gradientStart: Palette.brandLight,
    gradientEnd: Palette.brandDeep,
    /** The logo mark: brand on light, brandBright on dark. */
    brandMark: Palette.brand,

    background: Palette.white,
    backgroundElement: Palette.white,
    backgroundSelected: Palette.brandSoft,
    elevated: Palette.white,
    surface: Palette.white,
    surfaceSecondary: Palette.gray100,
    surfaceSunken: Palette.gray100,

    text: Palette.ink,
    textSecondary: Palette.gray700,
    textMuted: Palette.grayMutedLight,
    textInverse: Palette.white,
    textLink: Palette.brand,

    border: Palette.gray300,
    borderSubtle: Palette.gray200,
    borderStrong: Palette.brand,
    focusRing: Palette.brand,

    actionPrimary: Palette.brand,
    actionPrimaryPressed: Palette.brandPressed,
    actionDisabled: Palette.gray200,

    success: Palette.brand,
    successSoft: Palette.brandSoft,
    warning: Palette.amber,
    warningText: Palette.amberText,
    warningSoft: Palette.amberSoft,
    error: Palette.critical,
    errorSoft: Palette.criticalSoft,
    info: Palette.brand,

    /** Highlights: reasons, the verified badge, featured accents. */
    highlight: Palette.brand,
    highlightSoft: Palette.brandSoft,
    onHighlight: Palette.white,

    scrim: 'rgba(17, 19, 18, 0.4)',
  },
  dark: {
    // Neutral near-black with depth from lighter surfaces, one brand accent
    // (the DICE / RA / Luma pattern). No tinted backgrounds.
    primary: Palette.brandBright,
    primaryPressed: Palette.brandBrightPressed,
    primarySoft: Palette.inkHigh,
    onPrimary: Palette.ink,
    selected: Palette.brandBright,
    onSelected: Palette.ink,
    gradientStart: Palette.brandBrightLight,
    gradientEnd: Palette.brandBrightPressed,
    brandMark: Palette.brandBright,

    background: Palette.ink,
    backgroundElement: Palette.inkRaised,
    backgroundSelected: Palette.inkHigh,
    elevated: Palette.inkRaised,
    surface: Palette.inkRaised,
    surfaceSecondary: Palette.inkHigh,
    surfaceSunken: Palette.inkHigh,

    text: Palette.canvas,
    textSecondary: '#CDD0CD',
    textMuted: Palette.grayMutedDark,
    textInverse: Palette.ink,
    textLink: Palette.brandBright,

    border: '#2E302F',
    borderSubtle: '#232524',
    borderStrong: Palette.brandBright,
    focusRing: Palette.brandBright,

    actionPrimary: Palette.brandBright,
    actionPrimaryPressed: Palette.brandBrightPressed,
    actionDisabled: '#2A2C2B',

    success: Palette.brandBright,
    successSoft: Palette.inkHigh,
    warning: Palette.amberLight,
    warningText: Palette.amberLight,
    warningSoft: '#33281C',
    error: Palette.criticalLight,
    errorSoft: '#3A1F1D',
    info: Palette.brandBright,

    highlight: Palette.brandBright,
    highlightSoft: Palette.inkHigh,
    onHighlight: Palette.ink,

    scrim: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ThemeColors = {
  [K in keyof typeof Colors.light]: string;
};
