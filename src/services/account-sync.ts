import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import type { AccountService } from './account.ts';
import type { DiscoveryProfileStore } from './discovery-profile-store.ts';
import { mergePlans, mergeProfile, toSyncPayload } from './plan-sync.ts';
import type { SavedEntry, SavedEventsStore } from './saved-events-store.ts';

interface SyncDeps {
  account: Pick<AccountService, 'sync'>;
  saved: SavedEventsStore;
  profiles: Pick<DiscoveryProfileStore, 'load' | 'replace'>;
  now?: () => Date;
}

/**
 * One backup (docs/product-decisions.md, "Spec: accounts"): send what this
 * phone has, then keep per field the latest of this phone (read again, so a
 * change made during the request is not lost) and the account. A failure
 * throws before anything on the phone changes.
 */
export async function syncAccount({
  account,
  saved,
  profiles,
  now = () => new Date(),
}: SyncDeps): Promise<{
  entries: SavedEntry[];
  profile: LocalDiscoveryProfile | null;
}> {
  const sentRemovals = await saved.removals();
  const profile = await profiles.load();
  const held = await account.sync(
    toSyncPayload(await saved.list(), sentRemovals),
    profile ? { discovery: profile, updated_at: profile.updatedAt } : null,
  );

  const entries = await saved.applySynced(
    mergePlans(await saved.list(), await saved.removals(), held.plans),
    sentRemovals,
  );

  const current = await profiles.load();
  const merged = mergeProfile(current, held.profile, now());
  const restored =
    merged && merged !== current ? await profiles.replace(merged) : current;
  return { entries, profile: restored };
}
