import { AGE_GROUPS, type AgeGroup } from '../types/consent.type.ts';
import type { KeyValueStore } from './key-value-store.ts';

/**
 * The age group given in the first consent box, kept on this phone so it is
 * asked once (docs/product-decisions.md, "Spec: consent, privacy settings and
 * notifications"). Changeable in Privacy settings.
 */
export const AGE_GROUP_KEY = 'meyalo.ageGroup.v1';

export interface StoredAgeGroup {
  group: AgeGroup;
  /** When it was last given or changed. */
  changedAt: string;
}

export interface AgeGroupSetting {
  /** Null when never given or unreadable: then it is asked again. */
  get(): Promise<StoredAgeGroup | null>;
  set(group: AgeGroup): Promise<void>;
  clear(): Promise<void>;
}

export function createAgeGroupSetting(
  store: KeyValueStore,
  now: () => Date = () => new Date(),
): AgeGroupSetting {
  return {
    async get() {
      const raw = await store.getItem(AGE_GROUP_KEY);
      if (raw === null) return null;
      try {
        const value = JSON.parse(raw) as Partial<StoredAgeGroup> | null;
        if (
          value &&
          typeof value === 'object' &&
          (AGE_GROUPS as readonly unknown[]).includes(value.group) &&
          typeof value.changedAt === 'string'
        ) {
          return { group: value.group as AgeGroup, changedAt: value.changedAt };
        }
      } catch {
        // Falls through: asking again is the safe answer.
      }
      return null;
    },
    async set(group) {
      const value: StoredAgeGroup = { group, changedAt: now().toISOString() };
      await store.setItem(AGE_GROUP_KEY, JSON.stringify(value));
    },
    async clear() {
      await store.removeItem(AGE_GROUP_KEY);
    },
  };
}
