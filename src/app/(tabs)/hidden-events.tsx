import { RotateCcw } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InlineMessage } from '@/components/ui/inline-message';
import { Page, PageHeader } from '@/components/ui/page';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useHiddenEvents, useRestoreEvent } from '@/hooks/use-hidden-events';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { formatEventDate } from '@/services/event-mapping';
import type { HiddenEntry } from '@/services/hidden-events-store';

/** You → Hidden events: everything marked "Not interested", with restore. */
export default function HiddenEventsScreen() {
  const i18n = useTranslation();
  const { t } = i18n;
  const colors = useTheme();
  const toast = useToast();
  const { data: entries = [], isPending, isError, refetch } = useHiddenEvents();
  const restore = useRestoreEvent();

  const showAgain = (entry: HiddenEntry) =>
    restore.mutate(entry.id, {
      onSuccess: () =>
        toast.show({
          tone: 'success',
          message: t('hiddenEvents.restored', { title: entry.snapshot.title }),
        }),
      onError: () =>
        toast.show({ tone: 'error', message: t('hiddenEvents.restoreFailed') }),
    });

  // Most recently hidden first.
  const newestFirst = [...entries].reverse();

  return (
    <Page>
      <PageHeader
        title={t('hiddenEvents.title')}
        subtitle={t('hiddenEvents.subtitle')}
      />

      {isPending ? null : isError ? (
        <InlineMessage
          tone="error"
          message={t('hiddenEvents.loadError')}
          actionLabel={t('hiddenEvents.retry')}
          onAction={() => refetch()}
        />
      ) : newestFirst.length === 0 ? (
        <Text variant="callout" tone="muted">
          {t('hiddenEvents.empty')}
        </Text>
      ) : (
        <Stack gap="md">
          {newestFirst.map((entry) => (
            <Card key={entry.id} variant="outlined" padding="md">
              <Stack direction="row" gap="md" align="center">
                <Stack gap="xxs" style={styles.fill}>
                  <Text variant="headline" numberOfLines={2}>
                    {entry.snapshot.title}
                  </Text>
                  <Text variant="footnote" tone="muted">
                    {formatEventDate(
                      entry.snapshot.startsAt,
                      entry.snapshot.timezone || null,
                      i18n,
                    )}
                  </Text>
                  {entry.reason ? (
                    <Text variant="footnote" tone="muted">
                      {t('hiddenEvents.reason', {
                        reason: t(`notInterested.${entry.reason}`),
                      })}
                    </Text>
                  ) : null}
                </Stack>
                <Button
                  title={t('hiddenEvents.restore')}
                  accessibilityLabel={t('hiddenEvents.restoreLabel', {
                    title: entry.snapshot.title,
                  })}
                  variant="ghost"
                  size="small"
                  icon={<RotateCcw size={16} color={colors.primary} />}
                  onPress={() => showAgain(entry)}
                />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
