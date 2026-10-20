import { StyleSheet, View } from 'react-native';
import { InlineMessage } from '@/components/ui/inline-message';
import { Page } from '@/components/ui/page';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { LEGAL_LABELS, LEGAL_LAST_UPDATED } from '@/content/legal/common';
import type { LegalBlock, LocalizedLegalDocument } from '@/content/legal/types';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { Radius, Spacing } from '@/theme';

/**
 * Renders one legal document in the app language. Static content with no data
 * fetching, so the page works offline and on any static host.
 */
export function LegalPage({ document }: { document: LocalizedLegalDocument }) {
  const { language } = useTranslation();
  const doc = document[language];
  const labels = LEGAL_LABELS[language];

  return (
    <Page width="readable">
      <Stack gap="xs">
        <Text variant="title1" accessibilityRole="header">
          {doc.title}
        </Text>
        <Text variant="footnote" tone="muted" numeric>
          {labels.lastUpdated}
          {labels.colon}
          {LEGAL_LAST_UPDATED[language]}
        </Text>
      </Stack>
      <InlineMessage tone="warning" message={labels.draft} />
      <Text variant="body">{doc.intro}</Text>

      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text variant="title2" accessibilityRole="header">
            {section.heading}
          </Text>
          {section.blocks.map((block, index) => (
            <Block
              // Blocks are static content and never reorder.
              // biome-ignore lint/suspicious/noArrayIndexKey: static content
              key={index}
              block={block}
              colon={labels.colon}
            />
          ))}
        </View>
      ))}
    </Page>
  );
}

function Block({ block, colon }: { block: LegalBlock; colon: string }) {
  switch (block.kind) {
    case 'paragraph':
      return <Text variant="body">{block.text}</Text>;
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((item) => (
            <View key={item} style={styles.listItem}>
              <Text variant="body" aria-hidden>
                •
              </Text>
              <Text variant="body" style={styles.listText}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'table':
      return (
        <StackedTable headers={block.headers} rows={block.rows} colon={colon} />
      );
  }
}

/**
 * A table reads badly at 375px, so each row becomes a card: the first cell is
 * the row title, the others are labelled with their column header.
 */
function StackedTable({
  headers,
  rows,
  colon,
}: {
  headers: string[];
  rows: string[][];
  colon: string;
}) {
  const colors = useTheme();
  return (
    <View style={styles.list}>
      {rows.map(([title, ...cells]) => (
        <View
          key={title}
          style={[
            styles.row,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Text variant="headline">{title}</Text>
          {cells.map((cell, index) => (
            <Text key={headers[index + 1]} variant="callout" tone="secondary">
              <Text variant="callout" weight="semiBold" tone="secondary">
                {headers[index + 1]}
                {colon}
              </Text>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  list: {
    gap: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  listText: {
    flex: 1,
  },
  row: {
    gap: Spacing.xs,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
  },
});
