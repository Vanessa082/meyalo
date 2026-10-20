import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useGutter } from '@/hooks/use-gutter';
import { Spacing } from '@/theme';
import { SectionHeader } from './section-header';

interface RailProps {
  title?: string;
  actionText?: string;
  onPressAction?: () => void;
  children: ReactNode;
  /** Width of one item, so a swipe settles on an item edge. */
  snapWidth?: number;
}

/**
 * A horizontal row that runs to the screen edges while its first item lines
 * up with the page column. The one place a negative margin is allowed: it
 * cancels the page gutter instead of spacing siblings (BRAND.md, layout).
 */
export function Rail({
  title,
  actionText,
  onPressAction,
  children,
  snapWidth,
}: RailProps) {
  const gutter = useGutter();
  return (
    <View style={styles.rail}>
      {title ? (
        <SectionHeader
          title={title}
          actionText={actionText}
          onPressAction={onPressAction}
        />
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapWidth ? snapWidth + Spacing.md : undefined}
        style={{ marginHorizontal: -gutter }}
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    gap: Spacing.md,
  },
  content: {
    gap: Spacing.md,
  },
});
