import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

export type Variant =
  | 'header'
  | 'title'
  | 'subtitle'
  | 'subhead'
  | 'body'
  | 'caption'
  | 'captionBold'
  | 'link';

export type ThemeTextProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: Variant;
  numberOfLines?: number;
  onPress?: () => void;
};
