import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DeleteAccountCard } from '@/components/account/delete-account-card';
import { LearningRow } from '@/components/privacy/learning-row';
import { ReminderRow } from '@/components/privacy/reminder-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { InlineMessage } from '@/components/ui/inline-message';
import { Page, PageHeader } from '@/components/ui/page';
import { SectionHeader } from '@/components/ui/section-header';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { NoIndex } from '@/components/website/no-index';
import { useAgeGroup, useSetAgeGroup } from '@/hooks/use-consent';
import { useClearDeviceData } from '@/hooks/use-device-data';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { Spacing } from '@/theme';
import { AGE_GROUPS } from '@/types/consent.type';

const AGE_LABEL = {
  '18_plus': 'consent.age18Plus',
  under_18: 'consent.ageUnder18',
} as const;

/**
 * Privacy and notifications (docs/product-decisions.md, "Spec: consent,
 * privacy settings and notifications"): every choice about this phone and
 * what reaches our server, in one place.
 */
export default function PrivacySettingsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const { data: age = null } = useAgeGroup();
  const setAge = useSetAgeGroup();
  const clear = useClearDeviceData();
  const [confirming, setConfirming] = useState(false);

  const clearAll = () =>
    clear.mutate(undefined, {
      onSuccess: () => {
        router.replace('/(onboarding)/welcome');
        toast.show({ tone: 'success', message: t('privacySettings.cleared') });
      },
    });

  return (
    <Page width="readable">
      <NoIndex />
      <PageHeader
        title={t('privacySettings.title')}
        subtitle={t('privacySettings.subtitle')}
      />

      <Stack gap="md">
        <SectionHeader title={t('privacySettings.onPhone')} />
        <ReminderRow />
        <LearningRow />

        <Card variant="outlined" padding="md" style={styles.card}>
          <Stack gap="sm">
            <Text variant="headline" accessibilityRole="header">
              {t('privacySettings.age')}
            </Text>
            <Text variant="footnote" tone="muted">
              {t('privacySettings.ageBody')}
            </Text>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {AGE_GROUPS.map((group) => (
                <Chip
                  key={group}
                  role="radio"
                  label={t(AGE_LABEL[group])}
                  selected={age?.group === group}
                  onPress={() =>
                    setAge.mutate(group, {
                      onError: () =>
                        toast.show({
                          tone: 'error',
                          message: t('privacySettings.saveFailed'),
                        }),
                    })
                  }
                />
              ))}
            </View>
          </Stack>
        </Card>

        <Card variant="outlined" padding="md" style={styles.card}>
          <Stack gap="sm">
            <Text variant="headline" accessibilityRole="header">
              {t('privacySettings.phoneData')}
            </Text>
            <Text variant="footnote" tone="muted">
              {t('privacySettings.phoneDataBody')}
            </Text>
            {confirming ? (
              <Stack gap="sm">
                <InlineMessage
                  tone="warning"
                  message={t('privacySettings.clearConfirm')}
                />
                {clear.isError ? (
                  <InlineMessage
                    tone="error"
                    message={t('privacySettings.clearFailed')}
                  />
                ) : null}
                <Stack direction="row" gap="sm" wrap>
                  <Button
                    title={t('privacySettings.clearYes')}
                    variant="primary"
                    size="small"
                    loading={clear.isPending}
                    onPress={clearAll}
                  />
                  <Button
                    title={t('privacySettings.clearNo')}
                    variant="ghost"
                    size="small"
                    disabled={clear.isPending}
                    onPress={() => {
                      clear.reset();
                      setConfirming(false);
                    }}
                  />
                </Stack>
              </Stack>
            ) : (
              <Button
                title={t('privacySettings.clear')}
                variant="outline"
                size="small"
                icon={<Trash2 size={16} color={colors.primary} />}
                onPress={() => setConfirming(true)}
              />
            )}
          </Stack>
        </Card>

        <SectionHeader title={t('privacySettings.onServer')} />
        <DeleteAccountCard />
        <Card variant="outlined" padding="md" style={styles.card}>
          <Stack gap="sm">
            <Text variant="footnote" tone="muted">
              {t('privacySettings.serverBody')}
            </Text>
            <Button
              title={t('consent.privacyPolicy')}
              variant="ghost"
              size="small"
              onPress={() => router.push('/privacy')}
            />
          </Stack>
        </Card>
      </Stack>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
