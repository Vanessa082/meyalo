import { Bell } from 'lucide-react-native';
import { StyleSheet, Switch } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import {
  useReminderPermission,
  useReminderSetting,
  useSetReminders,
} from '@/hooks/use-reminders';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { openReminderSettings, remindersSupported } from '@/lib/reminders';

/**
 * Reminders on or off, with what the phone allows. When the phone refuses,
 * the switch stays off and the way to the phone's settings is shown.
 */
export function ReminderRow() {
  const colors = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const { data: setting } = useReminderSetting();
  const { data: permission } = useReminderPermission();
  const setReminders = useSetReminders();

  const denied = permission === 'denied';
  const on = setting?.on === true && permission === 'granted';
  const value = setReminders.isPending ? setReminders.variables : on;

  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Stack gap="sm">
        <Stack direction="row" gap="md" align="center">
          <IconCircle icon={Bell} />
          <Stack gap="xxs" style={styles.fill}>
            <Text variant="headline" accessibilityRole="header">
              {t('reminders.setting')}
            </Text>
            <Text variant="footnote" tone="muted">
              {!remindersSupported
                ? t('reminders.web')
                : denied
                  ? t('reminders.denied')
                  : on
                    ? t('reminders.settingOn')
                    : t('reminders.settingOff')}
            </Text>
          </Stack>
          {remindersSupported ? (
            <Switch
              value={value ?? false}
              disabled={denied || setting === undefined}
              onValueChange={(next) =>
                setReminders.mutate(next, {
                  onError: () =>
                    toast.show({
                      tone: 'error',
                      message: t('reminders.failed'),
                    }),
                })
              }
              accessibilityLabel={t('reminders.settingLabel')}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          ) : null}
        </Stack>
        {denied ? (
          <Button
            title={t('reminders.openSettings')}
            variant="ghost"
            size="small"
            onPress={() => void openReminderSettings()}
          />
        ) : null}
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
