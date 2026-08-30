import type { ReactNode } from 'react';
import type { TextStyle } from 'react-native';

export type Variant =
  | 'header'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'link';

export type ThemeTextProps = {
  children: ReactNode;
  style?: TextStyle;
  variant?: Variant;
  numberOfLines?: number;
  onPress?: () => void;
};
