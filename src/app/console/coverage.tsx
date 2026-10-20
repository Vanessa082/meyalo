import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ErrorState, LoadingState } from '@/components/console/console-ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCoverage } from '@/hooks/use-supply';
import { useTheme } from '@/hooks/use-theme';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import { Radius, Spacing } from '@/theme';

/**
 * Upcoming published events per city and topic. Zero cells are gaps to fill:
 * the point is to see where supply is missing, not to rank cities.
 */
export default function CoverageScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useTranslation();
  const query = useCoverage();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'Coverage' }} />
      <View style={styles.titleRow}>
        <Text variant="title2" accessibilityRole="header">
          Coverage
        </Text>
        <Button
          title="Events"
          variant="outline"
          size="small"
          onPress={() => router.push('/console')}
        />
      </View>
      <Text variant="footnote" tone="muted">
        Upcoming published events by city and topic. Highlighted zeros are gaps:
        that is where to look for sources (see docs/event-sources.md).
      </Text>

      {query.isPending ? (
        <LoadingState label="Loading coverage…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <ScrollView horizontal>
          <View>
            <View style={styles.row}>
              <View style={[styles.cell, styles.topicCell]} />
              {query.data.cities.map((city) => (
                <View key={city} style={styles.cell}>
                  <Text variant="footnote" weight="bold">
                    {city}
                  </Text>
                </View>
              ))}
            </View>
            {query.data.topics.map((topic) => (
              <View key={topic} style={styles.row}>
                <View style={[styles.cell, styles.topicCell]}>
                  <Text variant="footnote">
                    {t(`topics.${topic}` as TxKeyPath)}
                  </Text>
                </View>
                {query.data.cities.map((city) => {
                  const count = query.data.counts[city]?.[topic] ?? 0;
                  return (
                    <View
                      key={city}
                      accessibilityLabel={`${city}, ${topic}: ${count}`}
                      style={[
                        styles.cell,
                        {
                          backgroundColor:
                            count === 0 ? colors.warningSoft : colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        variant="footnote"
                        weight={count === 0 ? 'bold' : 'regular'}
                        style={{
                          color: count === 0 ? colors.warningText : colors.text,
                        }}
                      >
                        {String(count)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 96,
    minHeight: 40,
    padding: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicCell: {
    width: 180,
    alignItems: 'flex-start',
  },
});
