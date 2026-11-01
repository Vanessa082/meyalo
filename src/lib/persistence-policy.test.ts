import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  shouldPersistMutationKey,
  shouldPersistQueryKey,
} from './persistence-policy.ts';

describe('persistence policy', () => {
  it('keeps public event queries for offline use', () => {
    assert.ok(shouldPersistQueryKey(['events', 'for-you']));
    assert.ok(shouldPersistQueryKey(['events', 'detail', 'abc']));
  });

  it('never persists curator, profile or saved-event queries', () => {
    assert.ok(!shouldPersistQueryKey(['curation', 'list']));
    assert.ok(!shouldPersistQueryKey(['curator-session']));
    assert.ok(!shouldPersistQueryKey(['discovery-profile']));
    assert.ok(!shouldPersistQueryKey(['saved-events']));
    assert.ok(!shouldPersistQueryKey([]));
  });

  it('persists only outbox mutations', () => {
    assert.ok(shouldPersistMutationKey(['report']));
    assert.ok(!shouldPersistMutationKey(['set-saved']));
    assert.ok(!shouldPersistMutationKey(undefined));
  });
});
