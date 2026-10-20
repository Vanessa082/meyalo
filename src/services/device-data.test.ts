import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clearDeviceData, DEVICE_DATA_KEYS } from './device-data.ts';
import { memoryStore } from './key-value-store.ts';

describe('clear data on this phone', () => {
  it('removes everything Meyalo keeps and nothing else', async () => {
    const seeded = Object.fromEntries(
      DEVICE_DATA_KEYS.map((key) => [key, 'x']),
    );
    const store = memoryStore({ ...seeded, 'another.app': 'keep' });
    await clearDeviceData(store);
    assert.deepEqual([...store.data.keys()], ['another.app']);
  });

  it('covers the profile, plans, history, settings and offline cache', () => {
    for (const key of [
      'meyalo.discoveryProfile.v1',
      'meyalo.appEntry.v1',
      'meyalo.savedEvents.v2',
      'meyalo_saved_event_ids',
      'meyalo.removedPlans.v1',
      'meyalo.hiddenEvents.v1',
      'meyalo.openedEvents.v1',
      'meyalo.learnFromActivity.v1',
      'meyalo.ageGroup.v1',
      'meyalo.reminders.v1',
      'meyalo.locale.v1',
      'meyalo.queryCache',
    ]) {
      assert.ok(DEVICE_DATA_KEYS.includes(key), key);
    }
  });

  it('tries every key and then fails loudly if any could not be removed', async () => {
    const removed: string[] = [];
    await assert.rejects(
      clearDeviceData({
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async (key) => {
          if (key === 'meyalo.savedEvents.v2') throw new Error('locked');
          removed.push(key);
        },
      }),
      /meyalo\.savedEvents\.v2/,
    );
    assert.equal(removed.length, DEVICE_DATA_KEYS.length - 1);
  });
});
