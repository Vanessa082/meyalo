import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { ReminderPermission, ScheduledReminder } from './reminders.types';

export type { ReminderPermission, ScheduledReminder } from './reminders.types';

const CHANNEL_ID = 'reminders';

/** Local reminders only (docs/product-decisions.md, Feature 12). */
export const remindersSupported = true;

// Shown while the app is open too; reminders are the only notifications.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function reminderPermission(): Promise<ReminderPermission> {
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'ask' : 'denied';
}

/** Shows the system prompt. Android 13 shows it only once a channel exists. */
export async function requestReminderPermission(): Promise<boolean> {
  await ensureChannel();
  const status = await Notifications.requestPermissionsAsync();
  return status.granted;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Replaces everything scheduled with `reminders`. Meyalo schedules nothing
 * else, so cancelling all is exact and survives ids from older versions.
 */
export async function syncReminders(
  reminders: readonly ScheduledReminder[],
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (reminders.length === 0) return;
  await ensureChannel();
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: reminder.title,
        body: reminder.body,
        data: { eventId: reminder.eventId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminder.at),
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** The phone's settings for this app, where a refusal can be changed. */
export function openReminderSettings(): Promise<void> {
  return Linking.openSettings();
}

/** Calls `onOpen` with the event of a tapped reminder, now or later. */
export function onReminderOpened(
  onOpen: (eventId: string) => void,
): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    if (
      response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }
    const eventId = response.notification.request.content.data?.eventId;
    // Handled once: otherwise every launch would reopen the same event.
    Notifications.clearLastNotificationResponse();
    if (typeof eventId === 'string') onOpen(eventId);
  };
  // A tap that launched the app arrives before any listener.
  open(Notifications.getLastNotificationResponse());
  const subscription =
    Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
