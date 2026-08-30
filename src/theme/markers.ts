import { Colors } from './colors';

export type MarkerShape =
  | 'pin'
  | 'square'
  | 'circle'
  | 'flag'
  | 'star'
  | 'triangle';

export interface MarkerStateConfig {
  id: string;
  label: string; // Accessibility label
  backgroundColorLight: string;
  backgroundColorDark: string;
  borderColorLight: string;
  borderColorDark: string;
  iconName: string; // Vector icon name (e.g. for Ionicons/FontAwesome)
  shape: MarkerShape;
  scale: number; // For visual hierarchy
  description: string;
}

export const MarkerStates: Record<string, MarkerStateConfig> = {
  FOR_YOU: {
    id: 'FOR_YOU',
    label: 'Recommended For You',
    backgroundColorLight: Colors.light.categoryForYou,
    backgroundColorDark: Colors.dark.categoryForYou,
    borderColorLight: Colors.light.elevated,
    borderColorDark: Colors.dark.elevated,
    iconName: 'heart',
    shape: 'star', // Visual shape differentiation
    scale: 1.2, // Visual hierarchy
    description: 'Events matching your preferences',
  },
  EXPLORE: {
    id: 'EXPLORE',
    label: 'Explore Events',
    backgroundColorLight: Colors.light.categoryExplore,
    backgroundColorDark: Colors.dark.categoryExplore,
    borderColorLight: Colors.light.primary,
    borderColorDark: Colors.dark.primary,
    iconName: 'search',
    shape: 'pin',
    scale: 1.0,
    description: 'General events available for exploration',
  },
  AROUND_YOU: {
    id: 'AROUND_YOU',
    label: 'Events Around You',
    backgroundColorLight: Colors.light.categoryAroundYou,
    backgroundColorDark: Colors.dark.categoryAroundYou,
    borderColorLight: Colors.light.elevated,
    borderColorDark: Colors.dark.elevated,
    iconName: 'location',
    shape: 'circle',
    scale: 1.0,
    description: 'Events nearby your current location',
  },
  SAVED: {
    id: 'SAVED',
    label: 'Saved Event',
    backgroundColorLight: Colors.light.categorySaved,
    backgroundColorDark: Colors.dark.categorySaved,
    borderColorLight: Colors.light.elevated,
    borderColorDark: Colors.dark.elevated,
    iconName: 'bookmark',
    shape: 'square',
    scale: 1.1,
    description: 'Events you have bookmarked',
  },
  CHANGED: {
    id: 'CHANGED',
    label: 'Event Details Changed',
    backgroundColorLight: Colors.light.categoryChanged,
    backgroundColorDark: Colors.dark.categoryChanged,
    borderColorLight: Colors.light.text,
    borderColorDark: Colors.dark.text,
    iconName: 'alert-circle',
    shape: 'triangle',
    scale: 1.15,
    description: 'Events that have updated details or times',
  },
  CANCELLED: {
    id: 'CANCELLED',
    label: 'Cancelled Event',
    backgroundColorLight: Colors.light.categoryCancelled,
    backgroundColorDark: Colors.dark.categoryCancelled,
    borderColorLight: Colors.light.elevated,
    borderColorDark: Colors.dark.elevated,
    iconName: 'close-circle',
    shape: 'circle',
    scale: 0.9,
    description: 'Cancelled events',
  },
};

// Helper function to resolve theme colors for a given marker state
export function getMarkerColors(
  state: keyof typeof MarkerStates,
  isDarkMode: boolean,
) {
  const config = MarkerStates[state];
  if (!config)
    return {
      backgroundColor: Colors.light.markerPrimary,
      borderColor: Colors.light.elevated,
    };

  return {
    backgroundColor: isDarkMode
      ? config.backgroundColorDark
      : config.backgroundColorLight,
    borderColor: isDarkMode ? config.borderColorDark : config.borderColorLight,
  };
}
