/**
 * What the app keeps on the phone between launches (docs/product-decisions.md,
 * offline). Only public event data is persisted: it is identical for every
 * user and is what people need during a connectivity cut. Curator data,
 * sessions and anything personal never go into this cache.
 */

export const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Bump when the shape of persisted data changes (for example a new required
 * field on EventCardData), so old caches are dropped instead of misread.
 */
export const CACHE_VERSION = '4';

export const PERSISTED_QUERY_ROOTS: readonly string[] = ['events'];

export function shouldPersistQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    typeof queryKey[0] === 'string' &&
    PERSISTED_QUERY_ROOTS.includes(queryKey[0])
  );
}

/** Writes that wait for the network and must survive an app restart. */
export const OUTBOX_MUTATION_ROOTS: readonly string[] = ['report'];

export function shouldPersistMutationKey(
  mutationKey: readonly unknown[] | undefined,
): boolean {
  return (
    typeof mutationKey?.[0] === 'string' &&
    OUTBOX_MUTATION_ROOTS.includes(mutationKey[0])
  );
}
