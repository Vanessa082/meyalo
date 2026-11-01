import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { InlineMessage } from '@/components/ui/inline-message';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { useSubmissionStatus } from '@/hooks/use-supply';
import { useTranslation } from '@/i18n/locale-provider';
import { Spacing } from '@/theme';

/** Status of a suggestion, for whoever holds its link (id + token). */
export default function SubmissionStatusScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id = '', token = '' } = useLocalSearchParams<{
    id: string;
    token: string;
  }>();
  const status = useSubmissionStatus(id, token);

  let body: React.ReactNode;
  if (status.isPending) {
    body = (
      <Text variant="callout" tone="muted">
        {t('submit.statusLoading')}
      </Text>
    );
  } else if (status.isError) {
    body = <InlineMessage tone="error" message={t('submit.statusError')} />;
  } else if (!status.data) {
    body = (
      <InlineMessage tone="warning" message={t('submit.statusNotFound')} />
    );
  } else if (status.data.status === 'under_review') {
    body = <Text variant="body">{t('submit.statusUnderReview')}</Text>;
  } else if (status.data.status === 'published') {
    body = <Text variant="body">{t('submit.statusPublished')}</Text>;
  } else {
    body = (
      <View style={styles.block}>
        <Text variant="body">{t('submit.statusNotAdded')}</Text>
        {status.data.reason ? (
          <Text variant="callout" tone="secondary">
            {t('submit.statusReason', { reason: status.data.reason })}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Page width="readable">
      <Text variant="title1" accessibilityRole="header">
        {t('submit.statusTitle')}
      </Text>
      {body}
      <Button
        title={t('submit.suggestAnother')}
        variant="secondary"
        onPress={() => router.push('/submit')}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.sm,
  },
});
