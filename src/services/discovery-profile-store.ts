import type {
  DiscoveryProfilePatch,
  LocalDiscoveryProfile,
} from '../types/discovery-profile.ts';
import {
  applyProfilePatch,
  completeOnboarding,
  emptyProfile,
  parseStoredProfile,
} from './discovery-profile.ts';
import type { KeyValueStore } from './key-value-store.ts';

export const PROFILE_KEY = 'meyalo.discoveryProfile.v1';
export const ENTRY_KEY = 'meyalo.appEntry.v1';

export interface DiscoveryProfileStore {
  load(): Promise<LocalDiscoveryProfile | null>;
  /** Saves answers without completing onboarding. Rejects if storage fails. */
  update(patch: DiscoveryProfilePatch): Promise<LocalDiscoveryProfile>;
  /** Marks onboarding finished and the app as entered. */
  complete(): Promise<LocalDiscoveryProfile>;
  clear(): Promise<void>;
  /** Writes a profile restored from the account backup, as it is. */
  replace(profile: LocalDiscoveryProfile): Promise<LocalDiscoveryProfile>;
  /** "Explore first": open the tabs on next launch without a profile. */
  markEntered(): Promise<void>;
  /** Whether launch should skip the welcome screen. */
  hasEntered(): Promise<boolean>;
}

/**
 * The profile stays on this phone (Feature 3). Reads tolerate corrupt data;
 * writes reject so the interface never reports a save that did not happen.
 */
export function createDiscoveryProfileStore(
  store: KeyValueStore,
  clock: () => Date = () => new Date(),
): DiscoveryProfileStore {
  async function load(): Promise<LocalDiscoveryProfile | null> {
    let raw: string | null;
    try {
      raw = await store.getItem(PROFILE_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      return parseStoredProfile(JSON.parse(raw), clock());
    } catch {
      return null;
    }
  }

  async function write(profile: LocalDiscoveryProfile) {
    await store.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile;
  }

  async function markEntered() {
    await store.setItem(ENTRY_KEY, clock().toISOString());
  }

  return {
    load,
    async update(patch) {
      const current = (await load()) ?? emptyProfile(clock());
      return write(applyProfilePatch(current, patch, clock()));
    },
    async complete() {
      const current = (await load()) ?? emptyProfile(clock());
      const done = await write(completeOnboarding(current, clock()));
      await markEntered();
      return done;
    },
    async clear() {
      await store.removeItem(PROFILE_KEY);
    },
    replace: write,
    markEntered,
    async hasEntered() {
      try {
        if (await store.getItem(ENTRY_KEY)) return true;
      } catch {
        return false;
      }
      const profile = await load();
      return Boolean(profile?.onboardingCompletedAt);
    },
  };
}
