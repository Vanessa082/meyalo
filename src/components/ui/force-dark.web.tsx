import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

/**
 * Web: colours are CSS variables (theme/css-vars), so marking the subtree with
 * data-theme="dark" switches every colour inside it, in the static HTML too.
 */
export function ForceDark({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  // react-native-web renders `dataSet` as data-* attributes; React Native's
  // types do not list it.
  const marker = { dataSet: { theme: 'dark' } } as object;
  return (
    <View {...marker} style={style}>
      {children}
    </View>
  );
}
