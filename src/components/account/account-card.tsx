import { useRouter } from 'expo-router';
import { CloudUpload, UserRound } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAccountSession, useSignOut } from '@/hooks/use-account';
import { formatTimeAgo } from '@/i18n/format';
import { useTranslation } from '@/i18n/locale-provider';
import { useSyncStatus } from './account-sync-provider';

/**
 * You, first section (Feature 14): for a guest, the invitation to back up
 * plans; signed in, the email and Sign out. Signing out keeps the plans on
 * this phone.
 */
export function AccountCard() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const toast = useToast();
  const { data: session } = useAccountSession();
  const signOut = useSignOut();
  const email = session?.user.email ?? null;
  const sync = useSyncStatus();
  const status =
    sync.state === 'syncing'
      ? t('you.backingUp')
      : sync.state === 'waiting'
        ? t('you.waitingBackup')
        : sync.state === 'failed'
          ? t('you.backupFailed')
          : sync.state === 'synced' && sync.at
            ? t('you.backedUp', {
                time: formatTimeAgo(new Date(sync.at), new Date(), language),
              })
            : null;

  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Stack gap="sm">
        <Stack direction="row" gap="md" align="center">
          <IconCircle icon={session ? UserRound : CloudUpload} />
          <Stack gap="xxs" style={styles.fill}>
            <Text variant="headline" accessibilityRole="header">
              {session ? (email ?? t('you.account')) : t('account.signInTitle')}
            </Text>
            <Text variant="footnote" tone="muted">
              {session
                ? (status ?? t('you.accountSignedIn'))
                : t('you.accountGuest')}
            </Text>
          </Stack>
        </Stack>
        {session ? (
          <Button
            title={t('you.signOut')}
            variant="ghost"
            size="small"
            loading={signOut.isPending}
            onPress={() =>
              signOut.mutate(undefined, {
                onSuccess: () =>
                  toast.show({ tone: 'info', message: t('you.signedOut') }),
                onError: () =>
                  toast.show({
                    tone: 'error',
                    message: t('you.signOutFailed'),
                  }),
              })
            }
          />
        ) : (
          <Button
            title={t('you.signIn')}
            size="small"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        )}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
  },
});
