import { Colors } from './colors';
import { Typography, Families, Sizes, Weights, LineHeights } from './typography';
import { Spacing, TouchTargets, Dimensions } from './spacing';
import { Radius } from './radius';
import { Shadows } from './shadows';
import { MarkerStates, getMarkerColors } from './markers';

export const Theme = {
  Colors,
  Typography,
  Families,
  Sizes,
  Weights,
  LineHeights,
  Spacing,
  TouchTargets,
  Dimensions,
  Radius,
  Shadows,
  MarkerStates,
} as const;

export type AppTheme = typeof Theme;

export { Colors, Typography, Families, Sizes, Weights, LineHeights, Spacing, TouchTargets, Dimensions, Radius, Shadows, MarkerStates, getMarkerColors };

