import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

export type ScreenProps = {
  children: ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
};
