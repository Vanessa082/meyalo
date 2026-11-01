import type { KeyValueStore } from './key-value-store.ts';

/**
 * "Learn from my activity on this phone": whether saves, plans and opened
 * events shape For You. Explicit "Not interested" answers always count.
 */
export const LEARNING_SETTING_KEY = 'meyalo.learnFromActivity.v1';

export interface LearningSetting {
  isOn(): Promise<boolean>;
  set(on: boolean): Promise<void>;
}

export function createLearningSetting(store: KeyValueStore): LearningSetting {
  return {
    async isOn() {
      try {
        return (await store.getItem(LEARNING_SETTING_KEY)) !== 'off';
      } catch {
        // Unknown: the private choice.
        return false;
      }
    },
    async set(on) {
      await store.setItem(LEARNING_SETTING_KEY, on ? 'on' : 'off');
    },
  };
}
