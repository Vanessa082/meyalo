export const Palette = {
  teal: '#087F73',
  tealLight: '#0B9688',
  tealSoft: '#E8F2F0',
  ink: '#142428',
  inkLight: '#1C3136',
  canvas: '#F7F9F7',
  mist: '#E8F2F0',
  white: '#FFFFFF',
  amber: '#C76A10',
  amberLight: '#FF9A3C',
  critical: '#B42318',
  criticalLight: '#FDA29B',
  grayMutedLight: '#5C6B6F',
  grayMutedDark: '#A5B2B5',
  grayDisabledLight: '#D0D5DD',
  grayDisabledDark: '#344054',
  borderLight: '#E8F2F0',
  borderDark: '#2C3A3D',
};

export const Colors = {
  light: {
    // Brand
    primary: Palette.teal,
    primaryPressed: Palette.tealLight,
    primarySoft: Palette.tealSoft,
    
    // Backgrounds
    background: Palette.canvas,
    backgroundElement: Palette.white,
    backgroundSelected: Palette.mist,
    elevated: Palette.white,
    
    // Text
    text: Palette.ink,
    textSecondary: Palette.teal,
    textMuted: Palette.grayMutedLight,
    textInverse: Palette.white,
    textLink: Palette.teal,
    
    // Borders
    border: Palette.borderLight,
    borderSubtle: '#F2F4F7',
    borderStrong: Palette.teal,
    
    // Actions
    actionPrimary: Palette.teal,
    actionPrimaryPressed: Palette.tealLight,
    actionDisabled: Palette.grayDisabledLight,
    
    // Status
    success: Palette.teal,
    warning: Palette.amber,
    error: Palette.critical,
    info: Palette.teal,
    
    // Event category colors
    categoryForYou: Palette.teal,
    categoryExplore: Palette.ink,
    categoryAroundYou: Palette.tealLight,
    categorySaved: '#1570EF', // Safe brand blue
    categoryChanged: Palette.amber,
    categoryCancelled: Palette.critical,
    
    // Map markers
    markerPrimary: Palette.teal,
    markerSecondary: Palette.ink,
    markerNeutral: Palette.grayMutedLight,
  },
  dark: {
    // Brand
    primary: Palette.tealLight,
    primaryPressed: Palette.teal,
    primarySoft: Palette.inkLight,
    
    // Backgrounds
    background: Palette.ink,
    backgroundElement: Palette.inkLight,
    backgroundSelected: '#24373C',
    elevated: Palette.inkLight,
    
    // Text
    text: Palette.canvas,
    textSecondary: Palette.mist,
    textMuted: Palette.grayMutedDark,
    textInverse: Palette.ink,
    textLink: Palette.tealLight,
    
    // Borders
    border: Palette.borderDark,
    borderSubtle: '#1F2A2D',
    borderStrong: Palette.tealLight,
    
    // Actions
    actionPrimary: Palette.tealLight,
    actionPrimaryPressed: Palette.teal,
    actionDisabled: Palette.grayDisabledDark,
    
    // Status
    success: Palette.tealLight,
    warning: Palette.amberLight,
    error: Palette.criticalLight,
    info: Palette.tealLight,
    
    // Event category colors
    categoryForYou: Palette.tealLight,
    categoryExplore: Palette.canvas,
    categoryAroundYou: Palette.teal,
    categorySaved: '#53B1FD',
    categoryChanged: Palette.amberLight,
    categoryCancelled: Palette.criticalLight,
    
    // Map markers
    markerPrimary: Palette.tealLight,
    markerSecondary: Palette.canvas,
    markerNeutral: Palette.grayMutedDark,
  },
} as const;

export type ThemeColors = typeof Colors.light;
