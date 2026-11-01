import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LearningSetting,
  OpenedEventsService,
} from '@/services/personalisation.service';
import type { EventCardData } from '@/types/event.type';

const LEARNING_KEY = ['learning-setting'] as const;
const OPENED_KEY = ['opened-events'] as const;

/** "Learn from my activity on this phone" (You). */
export function useLearnFromActivity() {
  return useQuery({
    queryKey: LEARNING_KEY,
    queryFn: () => LearningSetting.isOn(),
  });
}

/** Switching off also deletes the history of opened events. */
export function useSetLearnFromActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) => {
      await LearningSetting.set(on);
      if (!on) await OpenedEventsService.clear();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEARNING_KEY });
      queryClient.invalidateQueries({ queryKey: OPENED_KEY });
    },
  });
}

export function useOpenedEvents(enabled: boolean) {
  return useQuery({
    queryKey: OPENED_KEY,
    queryFn: () => OpenedEventsService.list(),
    enabled,
  });
}

/** Called when an event page opens, only while learning is on. */
export function useRecordOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: { id: 'opened-events' },
    mutationFn: (event: EventCardData) => OpenedEventsService.record(event),
    onSuccess: (entries) => queryClient.setQueryData(OPENED_KEY, entries),
  });
}
