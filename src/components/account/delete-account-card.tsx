import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InlineMessage } from '@/components/ui/inline-message';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAccountSession, useDeleteAccount } from '@/hooks/use-account';
import { useTranslation } from '@/i18n/locale-provider';
import { isAccountError } from '@/services/account';

/**
 * Delete my account (Privacy and notifications), shown only when signed in.
 * An inline confirmation, then success only after the server confirmed.
 */
export function DeleteAccountCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: session } = useAccountSession();
  const remove = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);
  if (!session) return null;

  const failure = remove.error
    ? isAccountError(remove.error) && remove.error.kind === 'curator'
      ? t('privacySettings.deleteCurator')
      : t('privacySettings.deleteFailed')
    : null;

  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Stack gap="sm">
        <Text variant="headline" accessibilityRole="header">
          {t('privacySettings.deleteTitle')}
        </Text>
        <Text variant="footnote" tone="muted">
          {t('privacySettings.deleteBody')}
        </Text>
        {confirming ? (
          <Stack gap="sm">
            <InlineMessage
              tone="warning"
              message={t('privacySettings.deleteConfirm', {
                email: session.user.email ?? '',
              })}
            />
            {failure ? <InlineMessage tone="error" message={failure} /> : null}
            <Stack direction="row" gap="sm" wrap>
              <Button
                title={t('privacySettings.deleteYes')}
                variant="primary"
                size="small"
                loading={remove.isPending}
                onPress={() =>
                  remove.mutate(undefined, {
                    onSuccess: () => {
                      setConfirming(false);
                      toast.show({
                        tone: 'success',
                        message: t('privacySettings.deleted'),
                      });
                    },
                  })
                }
              />
              <Button
                title={t('privacySettings.deleteNo')}
                variant="ghost"
                size="small"
                disabled={remove.isPending}
                onPress={() => {
                  remove.reset();
                  setConfirming(false);
                }}
              />
            </Stack>
          </Stack>
        ) : (
          <Button
            title={t('privacySettings.deleteTitle')}
            variant="outline"
            size="small"
            onPress={() => setConfirming(true)}
          />
        )}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
});
