import { Colors } from './colors';

export type MarkerState =
  | 'default'
  | 'saved'
  | 'going'
  | 'changed'
  | 'cancelled';

export type MarkerShape = 'pin' | 'square' | 'circle' | 'triangle';

/**
 * Map markers for Around You. Each state differs by shape and icon as well as
 * colour so it stays distinguishable without colour vision.
 */
export interface MarkerStateConfig {
  shape: MarkerShape;
  /** lucide-react-native icon name. */
  iconName: string;
  scale: number;
  background: { light: string; dark: string };
  border: { light: string; dark: string };
}

export const MarkerStates: Record<MarkerState, MarkerStateConfig> = {
  default: {
    shape: 'pin',
    iconName: 'map-pin',
    scale: 1,
    background: { light: Colors.light.text, dark: Colors.dark.text },
    border: { light: Colors.light.surface, dark: Colors.dark.surface },
  },
  saved: {
    shape: 'square',
    iconName: 'bookmark',
    scale: 1.1,
    background: { light: Colors.light.surface, dark: Colors.dark.surface },
    border: { light: Colors.light.text, dark: Colors.dark.text },
  },
  going: {
    shape: 'circle',
    iconName: 'check',
    scale: 1.15,
    background: { light: Colors.light.primary, dark: Colors.dark.primary },
    border: { light: Colors.light.surface, dark: Colors.dark.surface },
  },
  changed: {
    shape: 'triangle',
    iconName: 'alert-triangle',
    scale: 1.15,
    background: { light: Colors.light.warning, dark: Colors.dark.warning },
    border: { light: Colors.light.text, dark: Colors.dark.text },
  },
  cancelled: {
    shape: 'circle',
    iconName: 'x',
    scale: 0.9,
    background: { light: Colors.light.error, dark: Colors.dark.error },
    border: { light: Colors.light.surface, dark: Colors.dark.surface },
  },
};

export function getMarkerColors(state: MarkerState, isDarkMode: boolean) {
  const config = MarkerStates[state];
  const scheme = isDarkMode ? 'dark' : 'light';
  return {
    backgroundColor: config.background[scheme],
    borderColor: config.border[scheme],
  };
}
