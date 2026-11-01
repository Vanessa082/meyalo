import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { type ReactNode, useState } from 'react';
import {
  connectQueryToDevice,
  createQueryClient,
  persistOptions,
} from './query-client';

connectQueryToDevice();

/**
 * The app's data layer: cache, offline persistence and the outbox. The only
 * place the screens' tree meets the data library (see docs/architecture.md).
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [persist] = useState(persistOptions);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persist}
      // Restored from the phone: send queued reports, then refresh.
      onSuccess={() =>
        queryClient
          .resumePausedMutations()
          .then(() => queryClient.invalidateQueries())
      }
    >
      {children}
    </PersistQueryClientProvider>
  );
}
