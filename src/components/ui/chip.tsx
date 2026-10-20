import { Check, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, TouchTargets } from '@/theme';
import { focusRing } from './focus';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** `checkbox` for multi-select groups, `radio` for single choice. */
  role?: 'checkbox' | 'radio';
  accessibilityHint?: string;
  testID?: string;
}

/**
 * A selectable choice. The leading glyph swaps between + and ✓ in a fixed
 * slot, so selecting never changes the chip's width or reflows its row.
 */
export function Chip({
  label,
  selected,
  onPress,
  role = 'checkbox',
  accessibilityHint,
  testID,
}: ChipProps) {
  const colors = useTheme();
  const Glyph = selected ? Check : Plus;

  return (
    <Pressable
      onPress={onPress}
      role={role}
      aria-checked={selected}
      aria-label={label}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={(state) => [
        styles.chip,
        {
          backgroundColor: selected
            ? colors.selected
            : state.pressed
              ? colors.surfaceSunken
              : colors.surface,
          borderColor: selected ? colors.selected : colors.border,
        },
        focusRing(state, colors),
      ]}
    >
      <Glyph
        size={16}
        strokeWidth={selected ? 2.5 : 2}
        color={selected ? colors.onSelected : colors.textMuted}
      />
      <Text
        variant="label"
        weight={selected ? 'semiBold' : 'medium'}
        style={selected ? { color: colors.onSelected } : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: TouchTargets.minimum,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
});
