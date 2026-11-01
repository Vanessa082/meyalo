import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';
import { Card } from './card';
import { Stack } from './stack';

/** Same footprint as EventCard, so content replaces it without a jump. */
const IMAGE = { width: 104, height: 140 };
const LINE = 12;

function EventCardSkeleton() {
  const colors = useTheme();
  const block = { backgroundColor: colors.surfaceSunken };

  return (
    <Card variant="outlined" padding="sm">
      <Stack direction="row" gap="md">
        <View style={[styles.image, block]} />
        <Stack gap="sm" style={styles.details}>
          <View style={[styles.line, block, { width: '40%' }]} />
          <View style={[styles.title, block, { width: '90%' }]} />
          <View style={[styles.title, block, { width: '65%' }]} />
          <View style={[styles.line, block, { width: '50%' }]} />
          <View style={[styles.line, block, { width: '35%' }]} />
        </Stack>
      </Stack>
    </Card>
  );
}

/** Placeholder cards while a list loads. Read out once as `label`. */
export function EventListSkeleton({
  label,
  count = 3,
}: {
  label: string;
  count?: number;
}) {
  return (
    <View
      role="progressbar"
      aria-label={label}
      aria-busy
      accessibilityLiveRegion="polite"
    >
      <Stack gap="md">
        {Array.from({ length: count }, (_, index) => (
          // Identical placeholders with a fixed count: the index is stable.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          <EventCardSkeleton key={index} />
        ))}
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    ...IMAGE,
    borderRadius: Radius.md,
  },
  details: {
    flex: 1,
    paddingTop: Spacing.xs,
  },
  line: {
    height: LINE,
    borderRadius: Radius.sm,
  },
  title: {
    height: LINE + Spacing.sm,
    borderRadius: Radius.sm,
  },
});
