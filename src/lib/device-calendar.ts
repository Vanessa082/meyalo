import { buildIcs, type CalendarEntry } from '@/services/calendar-entry';
import type { AddToCalendarResult } from './device-calendar.types';

export type { AddToCalendarResult } from './device-calendar.types';

/** Web: no permission; the file is a download. */
export async function calendarNeedsPrimer(): Promise<boolean> {
  return false;
}

/** Web: download an .ics file, which any calendar app opens. */
export async function addToDeviceCalendar(
  entry: CalendarEntry,
  fileName: string,
): Promise<AddToCalendarResult> {
  const blob = new Blob([buildIcs(entry, new Date())], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Give the browser a moment to start the download before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return 'downloaded';
}
