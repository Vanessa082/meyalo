import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGutter } from '@/hooks/use-gutter';
import { useTheme } from '@/hooks/use-theme';
import { Dimensions, Layout, Spacing } from '@/theme';
import { Text } from './text';

interface PageProps {
  children: ReactNode;
  /**
   * readable: one column of text and forms (560).
   * wide: lists and dashboards (800). Both centre on tablets and the web.
   */
  width?: 'readable' | 'wide';
  /** Insets the page must handle itself. Screens under the app header and
   *  tab bar need none: those handle the top and bottom insets. */
  edges?: ('top' | 'bottom')[];
  /** Full-width content above the column, such as a cover image. */
  hero?: ReactNode;
  /** Stays at the bottom while the page scrolls, e.g. the main action. */
  footer?: ReactNode;
}

/**
 * The layout every screen shares: safe area, the theme gutter, a centred
 * maximum width, the same top and bottom padding, and one gap between page
 * sections. Screens put sections inside; sections never add outer margins.
 */
export function Page({
  children,
  width = 'wide',
  edges = [],
  hero,
  footer,
}: PageProps) {
  const colors = useTheme();
  const gutter = useGutter();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {hero}
        <View
          style={[
            styles.column,
            {
              paddingHorizontal: gutter,
              maxWidth:
                width === 'readable'
                  ? Layout.readableWidth + gutter * 2
                  : Dimensions.maxContentWidth + gutter * 2,
            },
          ]}
        >
          {children}
        </View>
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: gutter,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View
            style={{
              width: '100%',
              alignSelf: 'center',
              maxWidth:
                width === 'readable'
                  ? Layout.readableWidth
                  : Dimensions.maxContentWidth,
            }}
          >
            {footer}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** Title and optional one-line purpose, the same on every tab. */
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      <Text variant="title1" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="callout" tone="muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  column: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xxl,
  },
  header: {
    gap: Spacing.xs,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
  },
});
