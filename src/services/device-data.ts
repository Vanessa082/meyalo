import { LANGUAGE_STORAGE_KEY } from '../i18n/language.ts';
import { AGE_GROUP_KEY } from './age-group-setting.ts';
import { ENTRY_KEY, PROFILE_KEY } from './discovery-profile-store.ts';
import { FRIEND_ANSWERS_KEY } from './friend-answers-store.ts';
import { HIDDEN_EVENTS_KEY } from './hidden-events-store.ts';
import type { KeyValueStore } from './key-value-store.ts';
import { LEARNING_SETTING_KEY } from './learning-setting.ts';
import { OPENED_EVENTS_KEY } from './opened-events-store.ts';
import { REMINDER_SETTING_KEY } from './reminder-setting.ts';
import {
  LEGACY_SAVED_EVENTS_KEY,
  REMOVED_PLANS_KEY,
  SAVED_EVENTS_KEY,
} from './saved-events-store.ts';

/** The offline copy of public events and reports waiting to be sent. */
export const QUERY_CACHE_KEY = 'meyalo.queryCache';

/**
 * Everything Meyalo keeps on this phone. A new store adds its key here, so
 * "Clear data on this phone" stays complete.
 */
export const DEVICE_DATA_KEYS: readonly string[] = [
  PROFILE_KEY,
  ENTRY_KEY,
  SAVED_EVENTS_KEY,
  LEGACY_SAVED_EVENTS_KEY,
  REMOVED_PLANS_KEY,
  HIDDEN_EVENTS_KEY,
  OPENED_EVENTS_KEY,
  LEARNING_SETTING_KEY,
  AGE_GROUP_KEY,
  REMINDER_SETTING_KEY,
  FRIEND_ANSWERS_KEY,
  LANGUAGE_STORAGE_KEY,
  QUERY_CACHE_KEY,
];

/**
 * Removes every key, even when one fails, then throws naming the ones left
 * so the screen never says "cleared" when something stayed.
 */
export async function clearDeviceData(store: KeyValueStore): Promise<void> {
  const results = await Promise.allSettled(
    DEVICE_DATA_KEYS.map((key) => store.removeItem(key)),
  );
  const left = DEVICE_DATA_KEYS.filter(
    (_, index) => results[index]?.status === 'rejected',
  );
  if (left.length > 0) {
    throw new Error(`Could not clear: ${left.join(', ')}`);
  }
}
