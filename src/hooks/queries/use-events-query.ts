import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/api/events.api';

/**
 * TanStack Query Hook: Fetch For You feed events
 */
export function useForYouEventsQuery() {
  return useQuery({
    queryKey: ['events', 'for-you'],
    queryFn: () => eventsApi.getForYouEvents(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * TanStack Query Hook: Fetch single event detail by ID
 */
export function useEventDetailQuery(id: string) {
  return useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: () => eventsApi.getEventById(id),
    enabled: Boolean(id),
  });
}

/**
 * TanStack Query Hook: Search events by keyword query
 */
export function useSearchEventsQuery(query: string) {
  return useQuery({
    queryKey: ['events', 'search', query],
    queryFn: () => eventsApi.searchEvents(query),
    enabled: query.length > 0,
  });
}
