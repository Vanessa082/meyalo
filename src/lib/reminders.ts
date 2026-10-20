import type { ReminderPermission, ScheduledReminder } from './reminders.types';

export type { ReminderPermission, ScheduledReminder } from './reminders.types';

/** Web: no reminders (docs/product-decisions.md, Feature 12). */
export const remindersSupported = false;

export async function reminderPermission(): Promise<ReminderPermission> {
  return 'none';
}

export async function requestReminderPermission(): Promise<boolean> {
  return false;
}

export async function syncReminders(
  _reminders: readonly ScheduledReminder[],
): Promise<void> {}

export async function openReminderSettings(): Promise<void> {}

export function onReminderOpened(
  _onOpen: (eventId: string) => void,
): () => void {
  return () => {};
}
