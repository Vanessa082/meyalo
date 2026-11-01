import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, TouchTargets } from '@/theme';
import { focusRing } from './focus';

export interface IconButtonProps {
  icon: ReactNode;
  onPress: () => void;
  /** Required: an icon alone has no accessible name. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: IconButtonProps) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={(state) => [
        styles.button,
        state.pressed && { backgroundColor: colors.surfaceSunken },
        focusRing(state, colors),
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TouchTargets.minimum,
    height: TouchTargets.minimum,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
