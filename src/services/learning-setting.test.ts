import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type KeyValueStore, memoryStore } from './key-value-store.ts';
import {
  createLearningSetting,
  LEARNING_SETTING_KEY,
} from './learning-setting.ts';

describe('learn from my activity setting', () => {
  it('is on until switched off, and remembers', async () => {
    const storage = memoryStore();
    const setting = createLearningSetting(storage);
    assert.equal(await setting.isOn(), true);
    await setting.set(false);
    assert.equal(await setting.isOn(), false);
    assert.equal(storage.data.get(LEARNING_SETTING_KEY), 'off');
    await setting.set(true);
    assert.equal(await setting.isOn(), true);
  });

  it('counts as off when it cannot be read', async () => {
    const broken: KeyValueStore = {
      getItem: async () => {
        throw new Error('unreadable');
      },
      setItem: async () => {},
      removeItem: async () => {},
    };
    assert.equal(await createLearningSetting(broken).isOn(), false);
  });
});
