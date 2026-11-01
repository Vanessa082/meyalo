import type { EventCardData } from '../types/event.type.ts';
import { eventSpan } from './event-time.ts';
import { DAY_MS, wallTimeToInstant, zonedDay } from './zoned-time.ts';

/**
 * Reminders (Feature 12; docs/product-decisions.md, "Spec: consent, privacy
 * settings and notifications"). Pure: the phone adapter cancels what it
 * scheduled before and schedules exactly this list.
 */

export type ReminderKind =
  | 'evening_before'
  | 'two_hours'
  | 'deadline_two_days'
  | 'deadline_morning'
  | 'how_was_it';

export interface Reminder {
  /** `${eventId}:${kind}`: the same reminder keeps the same id. */
  id: string;
  eventId: string;
  kind: ReminderKind;
  /** ISO instant. */
  at: string;
}

export interface PlannedForReminders {
  event: EventCardData;
  plan: 'saved' | 'going';
  registered: boolean;
  /** "Did you go?": the follow-up is asked only while unanswered. */
  attended?: boolean | null;
}

/** iOS keeps at most 64 scheduled notifications per app; leave headroom. */
export const MAX_REMINDERS = 60;

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const dayKey = (dayMs: number) => new Date(dayMs).toISOString().slice(0, 10);

/** `HH:mm` on the local day of `iso`, shifted by `days`, as an instant. */
function localTime(
  iso: string,
  days: number,
  time: string,
  timeZone: string,
): string | null {
  const day = zonedDay(iso, timeZone);
  if (!day) return null;
  return wallTimeToInstant(
    `${dayKey(day.date + days * DAY_MS)} ${time}`,
    timeZone,
  );
}

export function reminderSchedule(
  planned: readonly PlannedForReminders[],
  now: Date,
  regionTimeZone: string,
): Reminder[] {
  const nowMs = now.getTime();
  const reminders: Reminder[] = [];
  const add = (eventId: string, kind: ReminderKind, at: string | null) => {
    if (at && Date.parse(at) > nowMs) {
      reminders.push({ id: `${eventId}:${kind}`, eventId, kind, at });
    }
  };

  for (const { event, plan, registered, attended } of planned) {
    if (event.status === 'cancelled') continue;
    const zone = event.timezone || regionTimeZone;
    const start = Date.parse(event.startsAt);
    if (!Number.isFinite(start)) continue;

    if (plan === 'going') {
      add(
        event.id,
        'evening_before',
        localTime(event.startsAt, -1, '18:00', zone),
      );
      add(event.id, 'two_hours', new Date(start - TWO_HOURS_MS).toISOString());
      if (attended == null) {
        const end = new Date(eventSpan(event).end).toISOString();
        add(event.id, 'how_was_it', localTime(end, 1, '10:00', zone));
      }
    }

    const deadline = event.registrationDeadline;
    const deadlineMs = deadline ? Date.parse(deadline) : Number.NaN;
    if (!registered && deadline && Number.isFinite(deadlineMs)) {
      add(
        event.id,
        'deadline_two_days',
        new Date(deadlineMs - 2 * DAY_MS).toISOString(),
      );
      const morning = localTime(deadline, 0, '08:00', zone);
      if (morning && Date.parse(morning) < deadlineMs) {
        add(event.id, 'deadline_morning', morning);
      }
    }
  }

  return reminders
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(0, MAX_REMINDERS);
}
