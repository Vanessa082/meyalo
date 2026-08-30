import { useQuery } from '@tanstack/react-query';
import { EventService } from '@/services/event.service';
import type { EventCardData } from '@/types/event.type';

export function useForYouEvents() {
  return useQuery<EventCardData[]>({
    queryKey: ['events', 'for-you'],
    queryFn: () => EventService.fetchForYouEvents(),
  });
}
