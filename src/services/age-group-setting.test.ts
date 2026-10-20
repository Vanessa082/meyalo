import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AGE_GROUP_KEY, createAgeGroupSetting } from './age-group-setting.ts';
import { memoryStore } from './key-value-store.ts';

const NOW = new Date('2026-10-19T08:00:00Z');

describe('age group on this phone', () => {
  it('is unknown until answered, then remembered with the time', async () => {
    const setting = createAgeGroupSetting(memoryStore(), () => NOW);
    assert.equal(await setting.get(), null);
    await setting.set('under_18');
    assert.deepEqual(await setting.get(), {
      group: 'under_18',
      changedAt: NOW.toISOString(),
    });
  });

  it('asks again when the stored answer is unreadable', async () => {
    for (const bad of ['{nope', '{"group":"adult"}', '"18_plus"']) {
      const store = memoryStore({ [AGE_GROUP_KEY]: bad });
      assert.equal(await createAgeGroupSetting(store).get(), null, bad);
    }
  });

  it('can be forgotten', async () => {
    const store = memoryStore();
    const setting = createAgeGroupSetting(store, () => NOW);
    await setting.set('18_plus');
    await setting.clear();
    assert.equal(await setting.get(), null);
    assert.equal(store.data.has(AGE_GROUP_KEY), false);
  });

  it('fails loudly when the answer cannot be saved', async () => {
    const setting = createAgeGroupSetting({
      getItem: async () => null,
      setItem: async () => {
        throw new Error('disk full');
      },
      removeItem: async () => {},
    });
    await assert.rejects(setting.set('18_plus'));
  });
});
