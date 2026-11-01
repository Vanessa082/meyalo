import { Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ErrorState, LoadingState } from '@/components/console/console-ui';
import { Button } from '@/components/ui/button';
import { InlineMessage } from '@/components/ui/inline-message';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { publicUrl } from '@/config/env';
import { REGION } from '@/config/region';
import { useForYouEvents } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import type { AppLanguage } from '@/i18n/language';
import { useTranslation } from '@/i18n/locale-provider';
import enMessages from '@/i18n/messages/en.json';
import frMessages from '@/i18n/messages/fr.json';
import { createLocalizer } from '@/i18n/translate';
import { weeklyDigest } from '@/services/weekly-digest';
import { Radius, Spacing } from '@/theme';

/**
 * The weekly WhatsApp Channel post (docs/product-decisions.md, Feature 20):
 * published events of the next 7 days as text to paste. Channels have no
 * API, so a curator posts it by hand.
 */
export default function DigestScreen() {
  const colors = useTheme();
  const toast = useToast();
  const { t, language: appLanguage } = useTranslation();
  const [language, setLanguage] = useState<AppLanguage>(appLanguage);
  const events = useForYouEvents();

  if (events.isPending) return <LoadingState label="Loading events…" />;
  if (events.isError) {
    return <ErrorState error={events.error} onRetry={() => events.refetch()} />;
  }

  const i18n = createLocalizer({ en: enMessages, fr: frMessages }, language);
  const text = weeklyDigest(events.data, {
    now: new Date(),
    i18n,
    timeZone: REGION.timeZone,
    linkFor: (id) => publicUrl(`/event/${id}`) ?? `/event/${id}`,
  });

  const copy = async () => {
    try {
      if (Platform.OS !== 'web' || !navigator.clipboard) throw new Error();
      await navigator.clipboard.writeText(text);
      toast.show({ tone: 'success', message: t('digest.copied') });
    } catch {
      toast.show({ tone: 'error', message: t('digest.copyFailed') });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: t('digest.consoleTitle') }} />
      <Text variant="title2" accessibilityRole="header">
        {t('digest.consoleTitle')}
      </Text>
      <Text variant="footnote" tone="muted">
        {t('digest.consoleBody')}
      </Text>
      {publicUrl('/') ? null : (
        <InlineMessage tone="warning" message={t('digest.noLink')} />
      )}
      <View style={styles.row}>
        <SegmentedControl
          accessibilityLabel={t('digest.language')}
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Button title={t('digest.copy')} size="small" onPress={copy} />
      </View>
      <View
        style={[
          styles.text,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text variant="callout" selectable>
          {text}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.md,
  },
  text: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
});
