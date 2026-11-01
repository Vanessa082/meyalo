import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import { type KeyValueStore, memoryStore } from './key-value-store.ts';
import {
  createSavedEventsStore,
  LEGACY_SAVED_EVENTS_KEY,
  SAVED_EVENTS_KEY,
  SavedEventsError,
} from './saved-events-store.ts';

const NOW = new Date('2026-10-18T12:00:00Z');

function event(
  id: string,
  overrides: Partial<EventCardData> = {},
): EventCardData {
  return {
    id,
    slug: id,
    title: `Event ${id}`,
    organizerName: 'Organizer',
    eventType: 'Workshop',
    primaryCategory: 'Workshop',
    startsAt: '2026-10-28T09:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    priceType: 'free',
    status: 'scheduled',
    topics: [],
    offers: [],
    languages: ['en'],
    description: 'A long description that does not belong in a snapshot.',
    distanceKm: 3,
    ...overrides,
  };
}

const failingWrites: KeyValueStore = {
  getItem: async () => null,
  setItem: async () => {
    throw new Error('disk full');
  },
  removeItem: async () => {},
};

describe('saved events store', () => {
  it('starts empty and sets state idempotently', async () => {
    const saved = createSavedEventsStore(memoryStore(), () => NOW);
    assert.deepEqual(await saved.list(), []);
    await saved.setSaved(event('a'), true);
    await saved.setSaved(event('a'), true);
    assert.deepEqual(
      (await saved.list()).map((entry) => entry.id),
      ['a'],
    );
    await saved.setSaved(event('a'), false);
    await saved.setSaved(event('a'), false);
    assert.deepEqual(await saved.list(), []);
  });

  it('keeps a snapshot so the plan survives offline and unpublishing', async () => {
    const saved = createSavedEventsStore(memoryStore(), () => NOW);
    await saved.setSaved(event('a'), true);
    const [entry] = await saved.list();
    assert.equal(entry?.savedAt, NOW.toISOString());
    assert.equal(entry?.snapshot?.title, 'Event a');
    assert.equal(entry?.snapshot?.startsAt, '2026-10-28T09:00:00Z');
    // Long and context-dependent fields are not stored.
    const stored = entry?.snapshot as Record<string, unknown> | undefined;
    assert.ok(stored);
    assert.equal(stored.description, undefined);
    assert.equal(stored.distanceKm, undefined);
  });

  it('reads saves from the old id-only format without losing them', async () => {
    const store = memoryStore({
      [LEGACY_SAVED_EVENTS_KEY]: JSON.stringify(['old-1', 'old-2']),
    });
    const saved = createSavedEventsStore(store, () => NOW);
    assert.deepEqual(await saved.list(), [
      {
        id: 'old-1',
        savedAt: null,
        snapshot: null,
        plan: 'saved',
        registered: false,
        attended: null,
        attendedAt: null,
        note: null,
        stateChangedAt: null,
        registeredChangedAt: null,
        attendedChangedAt: null,
      },
      {
        id: 'old-2',
        savedAt: null,
        snapshot: null,
        plan: 'saved',
        registered: false,
        attended: null,
        attendedAt: null,
        note: null,
        stateChangedAt: null,
        registeredChangedAt: null,
        attendedChangedAt: null,
      },
    ]);
    await saved.setSaved(event('new'), true);
    assert.deepEqual(
      (await saved.list()).map((entry) => entry.id),
      ['old-1', 'old-2', 'new'],
    );
    // The old key goes only after the new format was written.
    assert.equal(store.data.has(LEGACY_SAVED_EVENTS_KEY), false);
    assert.ok(store.data.has(SAVED_EVENTS_KEY));
  });

  it('throws when the write fails instead of reporting success', async () => {
    const saved = createSavedEventsStore(failingWrites, () => NOW);
    await assert.rejects(
      saved.setSaved(event('a'), true),
      (error) => error instanceof SavedEventsError && error.kind === 'write',
    );
  });

  it('throws on corrupt storage and does not overwrite it', async () => {
    const store = memoryStore({ [SAVED_EVENTS_KEY]: '{not json' });
    const saved = createSavedEventsStore(store, () => NOW);
    await assert.rejects(
      saved.list(),
      (error) => error instanceof SavedEventsError && error.kind === 'corrupt',
    );
    await assert.rejects(saved.setSaved(event('a'), true));
    assert.equal(store.data.get(SAVED_EVENTS_KEY), '{not json');
  });

  it('treats malformed entries as corrupt', async () => {
    for (const bad of [
      '[1]',
      '[{"savedAt":null}]',
      '[{"id":"a","snapshot":5}]',
    ]) {
      const store = memoryStore({ [SAVED_EVENTS_KEY]: bad });
      await assert.rejects(createSavedEventsStore(store).list(), bad);
    }
    const legacy = memoryStore({ [LEGACY_SAVED_EVENTS_KEY]: '[1, "a"]' });
    await assert.rejects(createSavedEventsStore(legacy).list());
  });
});

describe('plan states', () => {
  it('reads earlier saves as Saved, not registered', async () => {
    const storage = memoryStore({
      [SAVED_EVENTS_KEY]: JSON.stringify([
        { id: 'a', savedAt: NOW.toISOString(), snapshot: null },
      ]),
    });
    const [entry] = await createSavedEventsStore(storage, () => NOW).list();
    assert.equal(entry.plan, 'saved');
    assert.equal(entry.registered, false);
  });

  it('moves an event to Going and back, and removes it from any state', async () => {
    const store = createSavedEventsStore(memoryStore(), () => NOW);
    let [entry] = await store.setPlan(event('a'), 'going');
    assert.equal(entry.plan, 'going');
    assert.ok(entry.snapshot);
    [entry] = await store.setPlan(event('a'), 'saved');
    assert.equal(entry.plan, 'saved');
    await store.setPlan(event('a'), 'going');
    assert.deepEqual(await store.setPlan(event('a'), null), []);
  });

  it('keeps registration ticked until changed, and ignores unknown events', async () => {
    const store = createSavedEventsStore(memoryStore(), () => NOW);
    await store.setPlan(event('a'), 'going');
    let [entry] = await store.setRegistered('a', true);
    assert.equal(entry.registered, true);
    [entry] = await store.setPlan(event('a'), 'saved');
    assert.equal(entry.registered, true);
    assert.equal((await store.setRegistered('nope', true)).length, 1);
  });

  it('the bookmark saves without downgrading Going, and removes', async () => {
    const store = createSavedEventsStore(memoryStore(), () => NOW);
    await store.setPlan(event('a'), 'going');
    const [kept] = await store.setSaved(event('a'), true);
    assert.equal(kept.plan, 'going');
    assert.deepEqual(await store.setSaved(event('a'), false), []);
  });

  it('treats an unknown plan state as corrupt', async () => {
    const storage = memoryStore({
      [SAVED_EVENTS_KEY]: JSON.stringify([
        { id: 'a', savedAt: null, snapshot: null, plan: 'maybe' },
      ]),
    });
    await assert.rejects(
      createSavedEventsStore(storage, () => NOW).list(),
      SavedEventsError,
    );
  });
});

describe('after the event', () => {
  // The event in `event()` starts 28 Oct 09:00Z; this is after it.
  const AFTER = new Date('2026-10-29T09:00:00Z');

  it('records whether the person went, and can change it', async () => {
    const store = createSavedEventsStore(memoryStore(), () => AFTER);
    await store.setPlan(event('a'), 'going');
    let [entry] = await store.setAttended('a', true);
    assert.equal(entry.attended, true);
    assert.equal(entry.attendedAt, AFTER.toISOString());
    [entry] = await store.setAttended('a', null);
    assert.equal(entry.attended, null);
    assert.equal(entry.attendedAt, null);
  });

  it('reads earlier entries as unanswered with no note', async () => {
    const storage = memoryStore({
      [SAVED_EVENTS_KEY]: JSON.stringify([
        { id: 'a', savedAt: null, snapshot: null, plan: 'going' },
      ]),
    });
    const [entry] = await createSavedEventsStore(storage, () => AFTER).list();
    assert.equal(entry.attended, null);
    assert.equal(entry.note, null);
  });

  it('keeps a trimmed private note only for events the person went to', async () => {
    const store = createSavedEventsStore(memoryStore(), () => AFTER);
    await store.setPlan(event('a'), 'going');
    let [entry] = await store.setNote('a', 'Met a mentor');
    assert.equal(entry.note, null, 'no note before saying Yes');
    await store.setAttended('a', true);
    [entry] = await store.setNote('a', '  Met a mentor  ');
    assert.equal(entry.note, 'Met a mentor');
    [entry] = await store.setNote('a', '   ');
    assert.equal(entry.note, null);
    await store.setNote('a', 'Kept');
    [entry] = await store.setAttended('a', false);
    assert.equal(entry.note, null, 'No removes the note');
    await assert.rejects(
      store
        .setAttended('a', true)
        .then(() => store.setNote('a', 'x'.repeat(501))),
      SavedEventsError,
    );
  });

  it('removes plans 90 days after the event ended, on the next change', async () => {
    const later = new Date('2027-01-27T12:00:00Z'); // 91 days after
    const storage = memoryStore();
    await createSavedEventsStore(storage, () => AFTER).setPlan(
      event('old'),
      'going',
    );
    const store = createSavedEventsStore(storage, () => later);
    const entries = await store.setPlan(
      event('new', { startsAt: '2027-02-01T09:00:00Z' }),
      'saved',
    );
    assert.deepEqual(
      entries.map((entry) => entry.id),
      ['new'],
    );
  });

  it('treats a malformed answer or note as corrupt', async () => {
    for (const bad of [{ attended: 'yes' }, { note: 5 }]) {
      const storage = memoryStore({
        [SAVED_EVENTS_KEY]: JSON.stringify([
          { id: 'a', savedAt: null, snapshot: null, ...bad },
        ]),
      });
      await assert.rejects(
        createSavedEventsStore(storage, () => AFTER).list(),
        SavedEventsError,
      );
    }
  });
});

describe('change times for backup', () => {
  const T1 = new Date('2026-10-20T08:00:00Z');
  const T2 = new Date('2026-10-20T09:00:00Z');

  it('records when the plan state, registered and the answer changed', async () => {
    let clock = T1;
    const store = createSavedEventsStore(memoryStore(), () => clock);
    let [entry] = await store.setPlan(event('a'), 'saved');
    assert.equal(entry.stateChangedAt, T1.toISOString());
    clock = T2;
    [entry] = await store.setPlan(event('a'), 'going');
    assert.equal(entry.stateChangedAt, T2.toISOString());
    [entry] = await store.setRegistered('a', true);
    assert.equal(entry.registeredChangedAt, T2.toISOString());
    [entry] = await store.setAttended('a', true);
    [entry] = await store.setAttended('a', null);
    assert.equal(
      entry.attendedChangedAt,
      T2.toISOString(),
      'taking back is a change too',
    );
  });

  it('remembers removals with their time, and forgets one when re-added', async () => {
    let clock = T1;
    const store = createSavedEventsStore(memoryStore(), () => clock);
    await store.setPlan(event('a'), 'going');
    clock = T2;
    await store.setSaved(event('a'), false);
    assert.deepEqual(await store.removals(), [
      { id: 'a', removedAt: T2.toISOString() },
    ]);
    await store.setSaved(event('a'), true);
    assert.deepEqual(await store.removals(), []);
  });

  it('writes back what a sync agreed on, keeping notes, and clears sent removals', async () => {
    const store = createSavedEventsStore(memoryStore(), () => T2);
    await store.setPlan(event('a'), 'going');
    await store.setAttended('a', true);
    await store.setNote('a', 'Kept on this phone');
    await store.setSaved(event('b'), true);
    await store.setSaved(event('b'), false);
    const [mine] = await store.list();
    const sent = await store.removals();
    const synced = await store.applySynced(
      [
        { ...mine, plan: 'saved', note: null },
        { ...mine, id: 'c', snapshot: null, note: null },
      ],
      sent,
    );
    assert.deepEqual(
      synced.map((entry) => [entry.id, entry.plan, entry.note]),
      [
        ['a', 'saved', 'Kept on this phone'],
        ['c', 'going', null],
      ],
    );
    assert.deepEqual(await store.removals(), []);
  });
});
