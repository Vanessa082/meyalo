import type { NotificationResponse } from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { ReminderPermission, ScheduledReminder } from './reminders.types';

export type { ReminderPermission, ScheduledReminder } from './reminders.types';

type NotificationsModule = typeof import('expo-notifications');

/**
 * expo-notifications, or null where its native module is missing. Expo Go
 * on Android has no push parts since SDK 53, and loading the library there
 * throws ("Cannot find native module 'ExpoTopicSubscriptionModule'"), which
 * took the whole app down. Loaded inside a guard so reminders are simply
 * unavailable there, as on the web; release builds include the module.
 */
function loadNotifications(): NotificationsModule | null {
  try {
    // A static import would throw while the app starts, before any guard.
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

const Notifications = loadNotifications();

const CHANNEL_ID = 'reminders';

/** Local reminders only (docs/product-decisions.md, Feature 12). */
export const remindersSupported = Notifications !== null;

// Shown while the app is open too; reminders are the only notifications.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function reminderPermission(): Promise<ReminderPermission> {
  if (!Notifications) return 'none';
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'ask' : 'denied';
}

/** Shows the system prompt. Android 13 shows it only once a channel exists. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!Notifications) return false;
  await ensureChannel(Notifications);
  const status = await Notifications.requestPermissionsAsync();
  return status.granted;
}

async function ensureChannel(
  notifications: NotificationsModule,
): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Replaces everything scheduled with `reminders`. Meyalo schedules nothing
 * else, so cancelling all is exact and survives ids from older versions.
 */
export async function syncReminders(
  reminders: readonly ScheduledReminder[],
): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (reminders.length === 0) return;
  await ensureChannel(Notifications);
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
  const notifications = Notifications;
  if (!notifications) return () => {};
  const open = (response: NotificationResponse | null) => {
    if (
      response?.actionIdentifier !== notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }
    const eventId = response.notification.request.content.data?.eventId;
    // Handled once: otherwise every launch would reopen the same event.
    notifications.clearLastNotificationResponse();
    if (typeof eventId === 'string') onOpen(eventId);
  };
  // A tap that launched the app arrives before any listener.
  open(notifications.getLastNotificationResponse());
  const subscription =
    notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
