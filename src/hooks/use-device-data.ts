import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceStorage } from '@/lib/device-storage';
import { syncReminders } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';
import { clearDeviceData } from '@/services/device-data';

/**
 * "Clear data on this phone": the profile, plans, hidden and opened events,
 * settings, the offline copy of events, reports waiting to be sent, and
 * reminders scheduled on the phone. It also signs out of this phone; the
 * account and its backup stay on the server.
 * Memory is emptied first so nothing is written back afterwards.
 */
export function useClearDeviceData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await syncReminders([]);
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      queryClient.getMutationCache().clear();
      queryClient.clear();
      await clearDeviceData(deviceStorage);
    },
  });
}
