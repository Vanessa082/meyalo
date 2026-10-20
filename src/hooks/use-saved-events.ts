import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SavedEventsService } from '@/services/saved-events.service';
import type { PlanState, SavedEntry } from '@/services/saved-events-store';
import type { EventCardData } from '@/types/event.type';

const SAVED_KEY = ['saved-events'] as const;

/** Saved events on this phone, with the snapshot taken when each was saved. */
export function useSavedEvents() {
  return useQuery<SavedEntry[]>({
    queryKey: SAVED_KEY,
    queryFn: () => SavedEventsService.list(),
  });
}

export function useSavedEventIds() {
  return useQuery<SavedEntry[], Error, string[]>({
    queryKey: SAVED_KEY,
    queryFn: () => SavedEventsService.list(),
    select: (entries) => entries.map((entry) => entry.id),
  });
}

/** Sets an event's saved state. Writes are serialized so rapid taps apply in
 *  order; the list refreshes from storage after each one. */
export function useSetEventSaved() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['set-saved'],
    scope: { id: 'saved-events' },
    mutationFn: ({ event, saved }: { event: EventCardData; saved: boolean }) =>
      SavedEventsService.setSaved(event, saved),
    onSuccess: (entries) => queryClient.setQueryData(SAVED_KEY, entries),
  });
}

/** Saved or Going, or out of the plan with null. Same queue as saving. */
export function useSetPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['set-plan'],
    scope: { id: 'saved-events' },
    mutationFn: ({
      event,
      plan,
    }: {
      event: EventCardData;
      plan: PlanState | null;
    }) => SavedEventsService.setPlan(event, plan),
    onSuccess: (entries) => queryClient.setQueryData(SAVED_KEY, entries),
  });
}

/** "I've registered" on a planned event. */
export function useSetRegistered() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['set-registered'],
    scope: { id: 'saved-events' },
    mutationFn: ({ id, registered }: { id: string; registered: boolean }) =>
      SavedEventsService.setRegistered(id, registered),
    onSuccess: (entries) => queryClient.setQueryData(SAVED_KEY, entries),
  });
}

/** "Did you go?" after the event: Yes, No, or null to take it back. */
export function useSetAttended() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['set-attended'],
    scope: { id: 'saved-events' },
    mutationFn: ({ id, attended }: { id: string; attended: boolean | null }) =>
      SavedEventsService.setAttended(id, attended),
    onSuccess: (entries) => queryClient.setQueryData(SAVED_KEY, entries),
  });
}

/** The private "What did you get out of it?" note. */
export function useSetNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['set-note'],
    scope: { id: 'saved-events' },
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      SavedEventsService.setNote(id, note),
    onSuccess: (entries) => queryClient.setQueryData(SAVED_KEY, entries),
  });
}
