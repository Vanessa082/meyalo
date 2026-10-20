import { useMutation } from '@tanstack/react-query';
import type { EventReportInput } from '@/types/event.type';

/**
 * Sends a report. The function is registered with `setMutationDefaults` in
 * src/lib/query-client.ts, so a report made offline is kept (paused and
 * persisted) and sent when the network returns, even after a restart.
 */
export function useReportEvent() {
  return useMutation<void, Error, EventReportInput>({
    mutationKey: ['report'],
  });
}
