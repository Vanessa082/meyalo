import { Colors } from './colors';
import { getMarkerColors, MarkerStates } from './markers';
import { Duration, Easings, PressScale } from './motion';
import { Radius } from './radius';
import { Shadows } from './shadows';
import { Dimensions, Layout, Spacing, TouchTargets } from './spacing';
import { Families, Fonts, TextStyles, Typography } from './typography';

export const Theme = {
  Colors,
  Typography,
  TextStyles,
  Fonts,
  Families,
  Spacing,
  Layout,
  TouchTargets,
  Dimensions,
  Radius,
  Shadows,
  MarkerStates,
  Duration,
  Easings,
} as const;

export type AppTheme = typeof Theme;

export {
  Colors,
  Dimensions,
  Duration,
  Easings,
  Families,
  Fonts,
  getMarkerColors,
  Layout,
  MarkerStates,
  PressScale,
  Radius,
  Shadows,
  Spacing,
  TextStyles,
  TouchTargets,
  Typography,
};
