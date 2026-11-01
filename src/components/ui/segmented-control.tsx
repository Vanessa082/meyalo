import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';
import { BrandFill } from './brand-fill';
import { focusRing } from './focus';
import { Text } from './text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/** A short, always-visible single choice, e.g. FR / EN. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const colors = useTheme();
  return (
    <View
      role="radiogroup"
      aria-label={accessibilityLabel}
      style={[styles.track, { backgroundColor: colors.surfaceSunken }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            role="radio"
            aria-checked={selected}
            aria-label={option.accessibilityLabel ?? option.label}
            style={(state) => [
              styles.segment,
              {
                backgroundColor: selected ? colors.selected : 'transparent',
                borderColor: 'transparent',
              },
              selected && styles.clip,
              focusRing(state, colors),
            ]}
          >
            {selected ? <BrandFill /> : null}
            <Text
              variant="label"
              weight={selected ? 'semiBold' : 'medium'}
              tone={selected ? 'default' : 'muted'}
              style={selected ? { color: colors.onSelected } : undefined}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    padding: Spacing.xxs,
    gap: Spacing.xxs,
  },
  segment: {
    minHeight: 40,
    minWidth: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: {
    overflow: 'hidden',
  },
});
