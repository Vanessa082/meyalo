import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { ForcedSchemeContext } from '@/hooks/forced-scheme';

/** Phones: everything inside uses the dark palette (hooks/use-theme). */
export function ForceDark({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ForcedSchemeContext.Provider value="dark">
      <View style={style}>{children}</View>
    </ForcedSchemeContext.Provider>
  );
}
