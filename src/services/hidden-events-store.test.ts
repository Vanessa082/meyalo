import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import {
  createHiddenEventsStore,
  HIDDEN_EVENTS_KEY,
  HiddenEventsError,
} from './hidden-events-store.ts';
import { type KeyValueStore, memoryStore } from './key-value-store.ts';

function event(overrides: Partial<EventCardData> = {}): EventCardData {
  return {
    id: 'evt',
    slug: 'evt',
    title: 'Pitch night',
    organizerName: 'Hub',
    eventType: 'Meetup',
    primaryCategory: 'Meetup',
    startsAt: '2026-10-21T17:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    city: 'Buea',
    priceType: 'paid',
    priceMin: 2000,
    priceMax: 2000,
    currency: 'XAF',
    status: 'scheduled',
    topics: ['technology'],
    offers: [],
    languages: ['en'],
    description: 'A long description that is not kept.',
    ...overrides,
  };
}

const NOW = new Date('2026-10-19T09:00:00Z');

describe('hidden events store', () => {
  it('starts empty', async () => {
    const store = createHiddenEventsStore(memoryStore(), () => NOW);
    assert.deepEqual(await store.list(), []);
  });

  it('keeps a small copy of a hidden event, without a reason yet', async () => {
    const storage = memoryStore();
    const store = createHiddenEventsStore(storage, () => NOW);
    await store.hide(event());
    const [entry] = await store.list();
    assert.equal(entry.id, 'evt');
    assert.equal(entry.hiddenAt, NOW.toISOString());
    assert.equal(entry.reason, null);
    assert.deepEqual(entry.snapshot, {
      title: 'Pitch night',
      startsAt: '2026-10-21T17:00:00Z',
      timezone: 'Africa/Douala',
      organizerName: 'Hub',
      topics: ['technology'],
      priceType: 'paid',
      format: 'in_person',
      city: 'Buea',
    });
    assert.doesNotMatch(
      storage.data.get(HIDDEN_EVENTS_KEY) ?? '',
      /long description/,
    );
  });

  it('hiding twice keeps one entry', async () => {
    const store = createHiddenEventsStore(memoryStore(), () => NOW);
    await store.hide(event());
    const entries = await store.hide(event());
    assert.equal(entries.length, 1);
  });

  it('records and clears a reason', async () => {
    const store = createHiddenEventsStore(memoryStore(), () => NOW);
    await store.hide(event());
    let [entry] = await store.setReason('evt', 'too_expensive');
    assert.equal(entry.reason, 'too_expensive');
    [entry] = await store.setReason('evt', null);
    assert.equal(entry.reason, null);
  });

  it('ignores a reason for an event that is not hidden', async () => {
    const store = createHiddenEventsStore(memoryStore(), () => NOW);
    assert.deepEqual(await store.setReason('nope', 'too_far'), []);
  });

  it('restores an event', async () => {
    const store = createHiddenEventsStore(memoryStore(), () => NOW);
    await store.hide(event());
    await store.hide(event({ id: 'other' }));
    const entries = await store.restore('evt');
    assert.deepEqual(
      entries.map((entry) => entry.id),
      ['other'],
    );
  });

  it('reports corrupt storage instead of replacing it', async () => {
    const storage = memoryStore({ [HIDDEN_EVENTS_KEY]: '{"not":"a list"}' });
    const store = createHiddenEventsStore(storage, () => NOW);
    await assert.rejects(store.list(), (error: unknown) => {
      assert.ok(error instanceof HiddenEventsError);
      assert.equal(error.kind, 'corrupt');
      return true;
    });
    await assert.rejects(store.hide(event()), HiddenEventsError);
    assert.equal(storage.data.get(HIDDEN_EVENTS_KEY), '{"not":"a list"}');
  });

  it('rejects an unknown reason in storage', async () => {
    const bad = JSON.stringify([
      {
        id: 'evt',
        hiddenAt: NOW.toISOString(),
        reason: 'boring',
        snapshot: { title: 'x', startsAt: NOW.toISOString(), topics: [] },
      },
    ]);
    const store = createHiddenEventsStore(
      memoryStore({ [HIDDEN_EVENTS_KEY]: bad }),
      () => NOW,
    );
    await assert.rejects(store.list(), HiddenEventsError);
  });

  it('fails visibly when the phone cannot write', async () => {
    const broken: KeyValueStore = {
      getItem: async () => null,
      setItem: async () => {
        throw new Error('disk full');
      },
      removeItem: async () => {},
    };
    const store = createHiddenEventsStore(broken, () => NOW);
    await assert.rejects(store.hide(event()), (error: unknown) => {
      assert.ok(error instanceof HiddenEventsError);
      assert.equal(error.kind, 'write');
      return true;
    });
  });
});
