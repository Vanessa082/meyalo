import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { EventService } from '@/services/event.service';
import type { SavedEntry } from '@/services/saved-events-store';
import type {
  EventCardData,
  EventCursor,
  EventSearchInput,
  EventSort,
} from '@/types/event.type';

const FOR_YOU_KEY = ['events', 'for-you'] as const;

export function useForYouEvents() {
  return useQuery<EventCardData[]>({
    queryKey: FOR_YOU_KEY,
    queryFn: () => EventService.fetchForYouEvents(),
  });
}

/**
 * One event. Starts from what the phone already has (the cached list, then
 * the snapshot of a saved event) so the page opens instantly and works
 * offline; the network refreshes it when it can.
 */
export function useEventDetail(id: string) {
  const queryClient = useQueryClient();
  return useQuery<EventCardData | null>({
    queryKey: ['events', 'detail', id],
    queryFn: () => EventService.fetchEventById(id),
    enabled: Boolean(id),
    initialData: () => {
      const listed = queryClient
        .getQueryData<EventCardData[]>(FOR_YOU_KEY)
        ?.find((event) => event.id === id);
      if (listed) return listed;
      const snapshot = queryClient
        .getQueryData<SavedEntry[]>(['saved-events'])
        ?.find((entry) => entry.id === id)?.snapshot;
      return snapshot ?? undefined;
    },
    // Seeded data counts as old as its source, so it is refreshed when online.
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(FOR_YOU_KEY)?.dataUpdatedAt,
  });
}

/**
 * Machine translation of an event, fetched only when the user asks
 * (`enabled`). Kept with the other event data, so it works offline once
 * loaded. Translations do not change for the same text, so they never go stale
 * within a session.
 */
export function useEventTranslation(
  id: string,
  target: 'en' | 'fr',
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['events', 'translation', id, target],
    queryFn: () => EventService.translateEvent(id, target),
    enabled: enabled && Boolean(id),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

/** Explore results, 20 at a time. Kept with the other event data, so the last
 *  search still shows offline. */
export function useExploreSearch(input: EventSearchInput, sort: EventSort) {
  return useInfiniteQuery({
    queryKey: ['events', 'explore', input, sort],
    queryFn: ({ pageParam }) =>
      EventService.searchEvents(input, sort, pageParam),
    initialPageParam: null as EventCursor | null,
    getNextPageParam: (page) => page.nextCursor,
  });
}
