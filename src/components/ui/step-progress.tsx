import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';
import { Text } from './text';

export interface StepProgressProps {
  current: number;
  total: number;
  /** Visible and announced text, e.g. "1 of 3". */
  label: string;
}

export function StepProgress({ current, total, label }: StepProgressProps) {
  const colors = useTheme();
  return (
    <View
      accessible
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-valuetext={label}
      style={styles.container}
    >
      <View style={styles.bars}>
        {Array.from({ length: total }, (_, index) => (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length, positional
            key={index}
            style={[
              styles.bar,
              {
                backgroundColor:
                  index < current ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>
      <Text variant="caption" tone="muted" numeric>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: Radius.full,
  },
});
