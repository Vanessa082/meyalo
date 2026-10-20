import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { buildAffinity } from '@/services/affinity';
import { HiddenEventsService } from '@/services/hidden-events.service';
import type { HiddenEntry, HiddenReason } from '@/services/hidden-events-store';
import type { EventCardData } from '@/types/event.type';
import { useLearnFromActivity, useOpenedEvents } from './use-learning';
import { useSavedEvents } from './use-saved-events';

const HIDDEN_KEY = ['hidden-events'] as const;
/** Writes run one at a time, in tap order. */
const SCOPE = { id: 'hidden-events' };

/** Events marked "Not interested" on this phone, in the order hidden. */
export function useHiddenEvents() {
  return useQuery<HiddenEntry[]>({
    queryKey: HIDDEN_KEY,
    queryFn: () => HiddenEventsService.list(),
  });
}

function useHiddenWrite<Input>(
  write: (input: Input) => Promise<HiddenEntry[]>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: SCOPE,
    mutationFn: write,
    onSuccess: (entries) => queryClient.setQueryData(HIDDEN_KEY, entries),
  });
}

export function useHideEvent() {
  return useHiddenWrite((event: EventCardData) =>
    HiddenEventsService.hide(event),
  );
}

export function useSetHiddenReason() {
  return useHiddenWrite(
    ({ id, reason }: { id: string; reason: HiddenReason | null }) =>
      HiddenEventsService.setReason(id, reason),
  );
}

export function useRestoreEvent() {
  return useHiddenWrite((id: string) => HiddenEventsService.restore(id));
}

/**
 * What For You needs from this phone's history: which events to leave out and
 * the learned affinity. `affinity` is undefined until both stores are read.
 * `isError` means some hidden events may show again; the screen says so.
 */
export function useFeedSignals() {
  const hidden = useHiddenEvents();
  const saved = useSavedEvents();
  const learning = useLearnFromActivity();
  const learnOn = learning.data === true;
  const opened = useOpenedEvents(learnOn);

  const hiddenIds = useMemo(
    () => new Set((hidden.data ?? []).map((entry) => entry.id)),
    [hidden.data],
  );

  const affinity = useMemo(() => {
    if (!hidden.data || !saved.data || learning.data === undefined) {
      return undefined;
    }
    // Explicit "Not interested" answers always count; saves, plans and
    // opens only while "Learn from my activity" is on.
    return buildAffinity({
      now: new Date(),
      hidden: hidden.data,
      saved: learnOn
        ? saved.data.flatMap((entry) =>
            entry.snapshot
              ? [
                  {
                    ...entry.snapshot,
                    plan: entry.plan,
                    savedAt: entry.savedAt,
                    attended: entry.attended,
                    attendedAt: entry.attendedAt,
                  },
                ]
              : [],
          )
        : [],
      // An unreadable history only means less learning, never a wrong feed.
      opened: learnOn ? (opened.data ?? []) : [],
    });
  }, [hidden.data, saved.data, learning.data, learnOn, opened.data]);

  return { hiddenIds, affinity, isError: hidden.isError };
}
