import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import { memoryStore } from './key-value-store.ts';
import {
  createOpenedEventsStore,
  OPENED_EVENTS_KEY,
  OpenedEventsError,
} from './opened-events-store.ts';

function event(id: string): EventCardData {
  return {
    id,
    slug: id,
    title: `Event ${id}`,
    organizerName: 'Hub',
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    startsAt: '2026-10-28T17:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    priceType: 'free',
    priceMin: null,
    priceMax: null,
    currency: null,
    status: 'scheduled',
    topics: ['technology'],
    offers: [],
    languages: ['en'],
    description: 'Not kept.',
  };
}

const at = (iso: string) => () => new Date(iso);

describe('opened events store', () => {
  it('keeps only what ranking needs', async () => {
    const storage = memoryStore();
    const store = createOpenedEventsStore(storage, at('2026-10-19T09:00:00Z'));
    await store.record(event('a'));
    assert.deepEqual(await store.list(), [
      {
        id: 'a',
        openedAt: '2026-10-19T09:00:00.000Z',
        topics: ['technology'],
        organizerName: 'Hub',
        startsAt: '2026-10-28T17:00:00Z',
        timezone: 'Africa/Douala',
      },
    ]);
    assert.doesNotMatch(storage.data.get(OPENED_EVENTS_KEY) ?? '', /Not kept/);
  });

  it('counts a re-open within half an hour once, a later one again', async () => {
    const storage = memoryStore();
    await createOpenedEventsStore(storage, at('2026-10-19T09:00:00Z')).record(
      event('a'),
    );
    await createOpenedEventsStore(storage, at('2026-10-19T09:20:00Z')).record(
      event('a'),
    );
    assert.equal((await createOpenedEventsStore(storage).list()).length, 1);
    await createOpenedEventsStore(storage, at('2026-10-19T10:00:00Z')).record(
      event('a'),
    );
    assert.equal((await createOpenedEventsStore(storage).list()).length, 2);
  });

  it('keeps the 200 most recent opens', async () => {
    const storage = memoryStore();
    for (let i = 0; i < 205; i += 1) {
      const minute = String(i % 60).padStart(2, '0');
      const hour = String(Math.floor(i / 60)).padStart(2, '0');
      await createOpenedEventsStore(
        storage,
        at(`2026-10-19T${hour}:${minute}:00Z`),
      ).record(event(`e${i}`));
    }
    const list = await createOpenedEventsStore(storage).list();
    assert.equal(list.length, 200);
    assert.equal(list[0].id, 'e5');
    assert.equal(list.at(-1)?.id, 'e204');
  });

  it('reports corrupt storage instead of replacing it', async () => {
    const storage = memoryStore({ [OPENED_EVENTS_KEY]: '{"x":1}' });
    const store = createOpenedEventsStore(storage);
    await assert.rejects(store.list(), OpenedEventsError);
    await assert.rejects(store.record(event('a')), OpenedEventsError);
    assert.equal(storage.data.get(OPENED_EVENTS_KEY), '{"x":1}');
  });
});

describe('clearing opened events', () => {
  it('deletes the whole history', async () => {
    const storage = memoryStore();
    const store = createOpenedEventsStore(storage, at('2026-10-19T09:00:00Z'));
    await store.record(event('a'));
    await store.clear();
    assert.equal(storage.data.has(OPENED_EVENTS_KEY), false);
    assert.deepEqual(await store.list(), []);
  });
});
