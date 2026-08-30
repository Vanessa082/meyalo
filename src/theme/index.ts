import { Colors } from './colors';
import { getMarkerColors, MarkerStates } from './markers';
import { Radius } from './radius';
import { Shadows } from './shadows';
import { Dimensions, Spacing, TouchTargets } from './spacing';
import {
  Families,
  LineHeights,
  Sizes,
  Typography,
  Weights,
} from './typography';

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

export {
  Colors,
  Dimensions,
  Families,
  getMarkerColors,
  LineHeights,
  MarkerStates,
  Radius,
  Shadows,
  Sizes,
  Spacing,
  TouchTargets,
  Typography,
  Weights,
};
