import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * TanStack Mutation Hook: Save or unsave an event ID locally
 */
export function useSaveEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const stored = await AsyncStorage.getItem('saved_event_ids');
      const savedIds: string[] = stored ? JSON.parse(stored) : [];

      const newIds = savedIds.includes(eventId)
        ? savedIds.filter((id) => id !== eventId)
        : [...savedIds, eventId];

      await AsyncStorage.setItem('saved_event_ids', JSON.stringify(newIds));
      return newIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
