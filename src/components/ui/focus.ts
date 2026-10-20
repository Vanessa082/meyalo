import type { PressableStateCallbackType, ViewStyle } from 'react-native';
import type { ThemeColors } from '@/theme/colors';

/**
 * Keyboard focus ring. react-native-web passes `focused` to Pressable style
 * callbacks; native platforms draw their own focus indication.
 */
export function focusRing(
  state: PressableStateCallbackType,
  colors: ThemeColors,
): ViewStyle | null {
  const focused = (state as PressableStateCallbackType & { focused?: boolean })
    .focused;
  return focused
    ? { outlineColor: colors.focusRing, outlineWidth: 2, outlineStyle: 'solid' }
    : null;
}
