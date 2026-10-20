import { router } from 'expo-router';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { REGION } from '@/config/region';
import { useForYouEvents } from '@/hooks/use-events';
import {
  useReminderPermission,
  useReminderSetting,
  useSetReminders,
} from '@/hooks/use-reminders';
import { useSavedEvents } from '@/hooks/use-saved-events';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import {
  onReminderOpened,
  remindersSupported,
  type ScheduledReminder,
  syncReminders,
} from '@/lib/reminders';
import {
  type PlannedForReminders,
  type ReminderKind,
  reminderSchedule,
} from '@/services/reminder-schedule';
import type { EventCardData } from '@/types/event.type';
import { PermissionPrimer } from './permission-primer';

interface RemindersApi {
  /** After an event is marked Going: asks once, the first time. */
  askAfterGoing: () => void;
}

const RemindersContext = createContext<RemindersApi>({
  askAfterGoing: () => {},
});

export function useReminders(): RemindersApi {
  return useContext(RemindersContext);
}

const TITLE: Record<ReminderKind, TxKeyPath> = {
  evening_before: 'reminders.eveningTitle',
  two_hours: 'reminders.twoHoursTitle',
  deadline_two_days: 'reminders.deadlineTwoDaysTitle',
  deadline_morning: 'reminders.deadlineTodayTitle',
  how_was_it: 'reminders.howWasItTitle',
};

/**
 * Reminders (Feature 12): keeps what the phone has scheduled equal to the
 * plans, opens the event when a reminder is tapped, and asks for permission
 * the first time someone marks an event Going. Phones only.
 */
export function RemindersProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { data: setting } = useReminderSetting();
  const { data: permission } = useReminderPermission();
  const setReminders = useSetReminders();
  const { data: saved } = useSavedEvents();
  const { data: events } = useForYouEvents();
  const [asking, setAsking] = useState(false);

  // The live event when known (new times, cancellations), else the copy
  // saved with the plan.
  const live = new Map((events ?? []).map((event) => [event.id, event]));
  const planned: PlannedForReminders[] = [];
  for (const entry of saved ?? []) {
    const event = live.get(entry.id) ?? entry.snapshot;
    if (event) {
      planned.push({
        event,
        plan: entry.plan,
        registered: entry.registered,
        attended: entry.attended,
      });
    }
  }
  const active = setting?.on === true && permission === 'granted';
  const scheduled: ScheduledReminder[] = active
    ? reminderSchedule(planned, new Date(), REGION.timeZone).map((reminder) => {
        const event =
          live.get(reminder.eventId) ??
          planned.find((p) => p.event.id === reminder.eventId)?.event;
        const title = event?.title ?? '';
        const isDeadline = reminder.kind.startsWith('deadline');
        return {
          ...reminder,
          title: t(TITLE[reminder.kind], { title }),
          body: isDeadline ? title : place(event, t('eventCard.online')),
        };
      })
    : [];
  // Only a real change reschedules; the list is rebuilt on every render.
  const signature = JSON.stringify(scheduled);
  const ready =
    remindersSupported &&
    saved !== undefined &&
    setting !== undefined &&
    permission !== undefined;

  useEffect(() => {
    if (!ready) return;
    syncReminders(JSON.parse(signature) as ScheduledReminder[]).catch(
      (error: unknown) => {
        // Reminders are a convenience: the plan itself is unaffected.
        console.warn('Reminders could not be scheduled', error);
      },
    );
  }, [ready, signature]);

  useEffect(
    () =>
      onReminderOpened((eventId) =>
        router.push({ pathname: '/event/[id]', params: { id: eventId } }),
      ),
    [],
  );

  const askAfterGoing = () => {
    if (!remindersSupported || setting !== null || permission === 'denied') {
      return;
    }
    if (permission === 'granted') {
      // Allowed for Meyalo before (a reinstall): nothing to ask.
      setReminders.mutate(true);
      return;
    }
    setAsking(true);
  };

  return (
    <RemindersContext.Provider value={{ askAfterGoing }}>
      {children}
      {remindersSupported ? (
        <PermissionPrimer
          kind="notifications"
          visible={asking}
          onAllow={() => {
            setAsking(false);
            setReminders.mutate(true);
          }}
          onNotNow={() => {
            setAsking(false);
            setReminders.mutate(false);
          }}
        />
      ) : null}
    </RemindersContext.Provider>
  );
}

function place(event: EventCardData | undefined, online: string): string {
  if (!event) return '';
  if (event.format === 'virtual') return online;
  return [event.venueName, event.city].filter(Boolean).join(', ');
}
