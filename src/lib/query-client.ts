import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  defaultShouldDehydrateMutation,
  defaultShouldDehydrateQuery,
  focusManager,
  onlineManager,
  QueryClient,
} from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';
import { QUERY_CACHE_KEY } from '@/services/device-data';
import { eventRepository } from '@/services/event.service';
import type { EventReportInput } from '@/types/event.type';
import { deviceStorage } from './device-storage';
import {
  CACHE_VERSION,
  PERSIST_MAX_AGE_MS,
  shouldPersistMutationKey,
  shouldPersistQueryKey,
} from './persistence-policy';

/** Static web rendering runs in Node, where there is no storage or network. */
const isServerRender = typeof window === 'undefined';

function isOnline(state: Network.NetworkState): boolean {
  // Unknown counts as online: only a definite "no" pauses requests.
  return state.isConnected !== false && state.isInternetReachable !== false;
}

/** Wires TanStack Query to the device's network and app state. Call once. */
export function connectQueryToDevice(): void {
  if (isServerRender) return;

  onlineManager.setEventListener((setOnline) => {
    Network.getNetworkStateAsync()
      .then((state) => setOnline(isOnline(state)))
      .catch(() => {
        // Unknown network state: keep the current value.
      });
    const subscription = Network.addNetworkStateListener((state) =>
      setOnline(isOnline(state)),
    );
    return () => subscription.remove();
  });

  // The web default (page visibility) already works; native needs AppState.
  if (Platform.OS !== 'web') {
    focusManager.setEventListener((handleFocus) => {
      const subscription = AppState.addEventListener('change', (status) =>
        handleFocus(status === 'active'),
      );
      return () => subscription.remove();
    });
  }
}

export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      // Kept in memory as long as on disk, or restored data is dropped early.
      queries: { gcTime: PERSIST_MAX_AGE_MS },
    },
  });

  // Registered here, not in a component, so a report queued offline can be
  // sent after the app restarts: a paused mutation keeps only its key and
  // variables, and finds its function through these defaults.
  client.setMutationDefaults(['report'], {
    mutationFn: (input: EventReportInput) => eventRepository.report(input),
    scope: { id: 'outbox' },
  });

  return client;
}

export function persistOptions(): PersistQueryClientProviderProps['persistOptions'] {
  return {
    persister: createAsyncStoragePersister({
      storage: isServerRender ? undefined : deviceStorage,
      key: QUERY_CACHE_KEY,
    }),
    maxAge: PERSIST_MAX_AGE_MS,
    buster: `${Constants.expoConfig?.version ?? '0'}:${CACHE_VERSION}`,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        defaultShouldDehydrateQuery(query) &&
        shouldPersistQueryKey(query.queryKey),
      shouldDehydrateMutation: (mutation) =>
        defaultShouldDehydrateMutation(mutation) &&
        shouldPersistMutationKey(mutation.options.mutationKey),
    },
  };
}
