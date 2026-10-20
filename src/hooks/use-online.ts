import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/** True unless the device is known to be offline (see connectQueryToDevice). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    onlineManager.subscribe.bind(onlineManager),
    () => onlineManager.isOnline(),
    () => true,
  );
}
