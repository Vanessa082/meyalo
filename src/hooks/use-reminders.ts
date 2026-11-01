import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { reminderPermission, requestReminderPermission } from '@/lib/reminders';
import { ReminderSetting } from '@/services/privacy.service';

const SETTING_KEY = ['reminder-setting'] as const;
const PERMISSION_KEY = ['reminder-permission'] as const;

/** On, off, or null when never answered. */
export function useReminderSetting() {
  return useQuery({
    queryKey: SETTING_KEY,
    queryFn: () => ReminderSetting.get(),
  });
}

/**
 * What the phone allows. Read again when the app comes back to the
 * foreground, since it can change in the phone's settings.
 */
export function useReminderPermission() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: PERMISSION_KEY });
      }
    });
    return () => subscription.remove();
  }, [queryClient]);
  return useQuery({
    queryKey: PERMISSION_KEY,
    queryFn: () => reminderPermission(),
  });
}

/**
 * Turns reminders on (asking the phone if needed) or off. Resolves to
 * whether they are on afterwards: a refusal leaves them off.
 */
export function useSetReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) => {
      let allowed = on;
      if (on && (await reminderPermission()) !== 'granted') {
        allowed = await requestReminderPermission();
      }
      await ReminderSetting.set(allowed);
      return allowed;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SETTING_KEY });
      queryClient.invalidateQueries({ queryKey: PERMISSION_KEY });
    },
  });
}
