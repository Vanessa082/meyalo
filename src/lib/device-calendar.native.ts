import * as Calendar from 'expo-calendar';
import { createEventInCalendarAsync } from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import type { CalendarEntry } from '@/services/calendar-entry';
import type { AddToCalendarResult } from './device-calendar.types';

export type { AddToCalendarResult } from './device-calendar.types';

/**
 * True when the next add would show the system prompt (iOS, never asked),
 * so our explanation comes first. Android adds through a system screen
 * with no permission at all.
 */
export async function calendarNeedsPrimer(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const permission = await Calendar.getCalendarPermissions(true);
  return permission.status === 'undetermined';
}

/**
 * Opens the phone's own "new event" screen, prefilled. The user picks the
 * calendar and confirms there; Meyalo never writes silently.
 */
export async function addToDeviceCalendar(
  entry: CalendarEntry,
  _fileName: string,
): Promise<AddToCalendarResult> {
  const details = {
    title: entry.title,
    startDate: new Date(entry.startDate),
    endDate: new Date(entry.endDate),
    location: entry.location || undefined,
    notes: entry.notes,
  };

  if (Platform.OS === 'android') {
    // An ACTION_INSERT intent: no calendar permission. The newer
    // addEventWithForm needs a calendar id, which needs read permission.
    await createEventInCalendarAsync(details);
    return 'opened';
  }

  // iOS: write-only access (iOS 17+), asked the first time only.
  const permission = await Calendar.requestCalendarPermissions(true);
  if (!permission.granted) return 'denied';
  const calendar = Calendar.getDefaultCalendarSync();
  const result = await calendar.addEventWithForm({
    ...details,
    url: entry.url,
  });
  return result.action === 'saved' ? 'saved' : 'cancelled';
}
