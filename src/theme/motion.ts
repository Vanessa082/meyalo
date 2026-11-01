import { Easing } from 'react-native-reanimated';

/**
 * Motion confirms a change; it never delays input. With the system
 * reduce-motion setting on, movement becomes an instant change or a fade.
 */
export const Duration = {
  /** Press feedback. */
  press: 120,
  /** A control changing state: save, select, reveal. */
  state: 200,
  /** Screens and sheets. */
  screen: 280,
} as const;

export const Easings = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  exit: Easing.bezier(0.3, 0, 1, 1),
} as const;

export const PressScale = 0.97;
