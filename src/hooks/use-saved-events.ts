import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SavedEventsService } from '@/services/saved-events.service';

export function useSavedEventIds() {
  return useQuery<string[]>({
    queryKey: ['saved-events'],
    queryFn: () => SavedEventsService.getSavedEventIds(),
  });
}

export function useToggleSaveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) =>
      SavedEventsService.toggleSaveEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
