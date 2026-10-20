import type { KeyValueStore } from './key-value-store.ts';

/**
 * Whether Meyalo schedules reminders on this phone, with when it was last
 * changed. Null until the person has answered (the first Going asks).
 */
export const REMINDER_SETTING_KEY = 'meyalo.reminders.v1';

export interface StoredReminderSetting {
  on: boolean;
  /** Null when the stored value was unreadable. */
  changedAt: string | null;
}

export function createReminderSetting(
  store: KeyValueStore,
  now: () => Date = () => new Date(),
) {
  return {
    async get(): Promise<StoredReminderSetting | null> {
      const raw = await store.getItem(REMINDER_SETTING_KEY);
      if (raw === null) return null;
      try {
        const value = JSON.parse(raw) as Partial<StoredReminderSetting> | null;
        if (
          value &&
          typeof value === 'object' &&
          typeof value.on === 'boolean' &&
          typeof value.changedAt === 'string'
        ) {
          return { on: value.on, changedAt: value.changedAt };
        }
      } catch {
        // Falls through to off.
      }
      // Answered but unreadable: off, so nothing is sent unasked.
      return { on: false, changedAt: null };
    },
    async set(on: boolean): Promise<void> {
      await store.setItem(
        REMINDER_SETTING_KEY,
        JSON.stringify({ on, changedAt: now().toISOString() }),
      );
    },
  };
}
