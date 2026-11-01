import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import type { CoverImageInput } from '@/services/cover-image';
import { eventCuration } from '@/services/event.service';
import { isEventRepositoryError } from '@/services/event-repository';
import type {
  Event,
  EventCheckInput,
  EventCursor,
  EventFilters,
  EventFormValues,
  EventSort,
  PublicationStatus,
} from '@/types/event.type';

export const curationKeys = {
  all: ['curation'] as const,
  lists: ['curation', 'list'] as const,
  list: (filters: EventFilters, sort: EventSort) =>
    ['curation', 'list', { filters, sort }] as const,
  event: (id: string) => ['curation', 'event', id] as const,
  taxonomy: ['curation', 'taxonomy'] as const,
  checks: (id: string) => ['curation', 'checks', id] as const,
  reports: (id: string) => ['curation', 'reports', id] as const,
};

const PAGE_SIZE = 25;

/** Only an unreachable server is worth retrying automatically. */
function retryUnavailable(failureCount: number, error: unknown): boolean {
  return (
    failureCount < 2 &&
    isEventRepositoryError(error) &&
    error.kind === 'unavailable'
  );
}

export function useCurationEvents(filters: EventFilters, sort: EventSort) {
  return useInfiniteQuery({
    queryKey: curationKeys.list(filters, sort),
    queryFn: ({ pageParam }) =>
      eventCuration.list({
        filters,
        sort,
        limit: PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: null as EventCursor | null,
    getNextPageParam: (page) => page.nextCursor,
    retry: retryUnavailable,
  });
}

export function useCurationEvent(id: string) {
  return useQuery({
    queryKey: curationKeys.event(id),
    queryFn: () => eventCuration.get(id),
    enabled: Boolean(id),
    retry: retryUnavailable,
  });
}

export function useEventTaxonomy() {
  return useQuery({
    queryKey: curationKeys.taxonomy,
    queryFn: () => eventCuration.taxonomy(),
    staleTime: 60 * 60 * 1000,
    retry: retryUnavailable,
  });
}

/** Cache the persisted event the server returned, then refresh lists. */
function useStorePersisted() {
  const queryClient = useQueryClient();
  return (event: Event) => {
    queryClient.setQueryData(curationKeys.event(event.id), event);
    queryClient.invalidateQueries({ queryKey: curationKeys.lists });
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };
}

export function useCreateEvent() {
  const store = useStorePersisted();
  return useMutation({
    mutationFn: (values: EventFormValues) => eventCuration.create(values),
    onSuccess: store,
  });
}

export function useUpdateEvent(event: Event | undefined) {
  const store = useStorePersisted();
  return useMutation({
    mutationFn: (values: EventFormValues) => {
      if (!event) throw new Error('The event has not loaded.');
      return eventCuration.update(event, values);
    },
    onSuccess: store,
  });
}

export function useChangePublication(event: Event | undefined) {
  const store = useStorePersisted();
  return useMutation({
    mutationFn: (to: PublicationStatus) => {
      if (!event) throw new Error('The event has not loaded.');
      return eventCuration.changePublication(event, to);
    },
    onSuccess: store,
  });
}

export function useRecordCheck(event: Event | undefined) {
  const store = useStorePersisted();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (check: Omit<EventCheckInput, 'eventId'>) => {
      if (!event) throw new Error('The event has not loaded.');
      return eventCuration.recordCheck(event, check);
    },
    onSuccess: ({ event: saved }) => {
      store(saved);
      queryClient.invalidateQueries({
        queryKey: curationKeys.checks(saved.id),
      });
    },
  });
}

/** Resized files go up under a fresh id, so a replaced image never serves a
 *  stale cached copy. */
export function useSetCoverImage(event: Event | undefined) {
  const store = useStorePersisted();
  return useMutation({
    mutationFn: ({
      images,
      input,
    }: {
      images: { small: Blob; large: Blob };
      input: CoverImageInput;
    }) => {
      if (!event) throw new Error('The event has not loaded.');
      return eventCuration.setCoverImage(
        event,
        Crypto.randomUUID(),
        images,
        input,
      );
    },
    onSuccess: store,
  });
}

export function useRemoveCoverImage(event: Event | undefined) {
  const store = useStorePersisted();
  return useMutation({
    mutationFn: () => {
      if (!event) throw new Error('The event has not loaded.');
      return eventCuration.removeCoverImage(event);
    },
    onSuccess: store,
  });
}

export function useEventChecks(id: string) {
  return useQuery({
    queryKey: curationKeys.checks(id),
    queryFn: () => eventCuration.checks(id),
    enabled: Boolean(id),
    retry: retryUnavailable,
  });
}

export function useEventReports(id: string) {
  return useQuery({
    queryKey: curationKeys.reports(id),
    queryFn: () => eventCuration.reports(id),
    enabled: Boolean(id),
    retry: retryUnavailable,
  });
}
