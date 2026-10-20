import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createFriendAnswersStore,
  FRIEND_ANSWERS_KEY,
} from './friend-answers-store.ts';
import { memoryStore } from './key-value-store.ts';

const PLAN = '7d3b0e1c-2f4a-4c6b-9d8e-0a1b2c3d4e5f';
const ANSWER = '1f6c6fa9-ce6f-4848-bc92-13723ff49dca';

describe('my answers to friends’ plans', () => {
  it('remembers my answer per plan, and forgets it', async () => {
    const store = createFriendAnswersStore(memoryStore());
    assert.equal(await store.get(PLAN), null);
    await store.set(PLAN, {
      responseToken: ANSWER,
      firstName: 'Bello',
      answer: 'maybe',
    });
    assert.deepEqual(await store.get(PLAN), {
      responseToken: ANSWER,
      firstName: 'Bello',
      answer: 'maybe',
    });
    await store.remove(PLAN);
    assert.equal(await store.get(PLAN), null);
  });

  it('reads unreadable storage as no answer', async () => {
    for (const bad of [
      '{nope',
      '[]',
      JSON.stringify({ [PLAN]: { answer: 'in' } }),
    ]) {
      const store = createFriendAnswersStore(
        memoryStore({ [FRIEND_ANSWERS_KEY]: bad }),
      );
      assert.equal(await store.get(PLAN), null, bad);
    }
  });
});
