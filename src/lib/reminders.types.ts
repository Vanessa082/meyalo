/** What the phone allows for notifications. `none`: no reminders here (web). */
export type ReminderPermission = 'granted' | 'ask' | 'denied' | 'none';

export interface ScheduledReminder {
  /** Stable, from the schedule: `${eventId}:${kind}`. */
  id: string;
  eventId: string;
  at: string;
  title: string;
  body: string;
}
