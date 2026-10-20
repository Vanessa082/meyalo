import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import {
  mergePlans,
  mergeProfile,
  type RemotePlan,
  toSyncPayload,
} from './plan-sync.ts';
import type { SavedEntry } from './saved-events-store.ts';

const id = (n: number) => `e1000000-0000-4000-8000-00000000000${n}`;
const T = (minute: number) =>
  new Date(Date.UTC(2026, 9, 20, 8, minute)).toISOString();

function local(n: number, overrides: Partial<SavedEntry> = {}): SavedEntry {
  return {
    id: id(n),
    savedAt: T(0),
    snapshot: {
      id: id(n),
      slug: `e${n}`,
      title: `Event ${n}`,
      organizerName: 'Org',
      eventType: 'Workshop',
      primaryCategory: 'Workshop',
      startsAt: '2026-11-01T09:00:00Z',
      timezone: 'Africa/Douala',
      format: 'in_person',
      priceType: 'free',
      status: 'scheduled',
      topics: [],
      offers: [],
      languages: ['en'],
    },
    plan: 'saved',
    registered: false,
    attended: null,
    attendedAt: null,
    note: null,
    stateChangedAt: T(0),
    registeredChangedAt: null,
    attendedChangedAt: null,
    ...overrides,
  };
}

function remote(n: number, overrides: Partial<RemotePlan> = {}): RemotePlan {
  return {
    event_id: id(n),
    state: 'saved',
    state_changed_at: T(0),
    removed_at: null,
    registered: false,
    registered_changed_at: null,
    attended: null,
    attended_changed_at: null,
    snapshot: local(n).snapshot as unknown as Record<string, unknown>,
    ...overrides,
  };
}

const ids = (entries: SavedEntry[]) => entries.map((e) => e.id).sort();

describe('merging plans', () => {
  it('combines 3 phone plans and 1 account plan into 4', () => {
    const merged = mergePlans([local(1), local(2), local(3)], [], [remote(4)]);
    assert.deepEqual(ids(merged), [id(1), id(2), id(3), id(4)]);
  });

  it('keeps the later change: Going on one phone beats an older Saved', () => {
    const [going] = mergePlans(
      [local(1, { plan: 'saved', stateChangedAt: T(1) })],
      [],
      [remote(1, { state: 'going', state_changed_at: T(5) })],
    );
    assert.equal(going?.plan, 'going');
    const [kept] = mergePlans(
      [local(1, { plan: 'going', stateChangedAt: T(9) })],
      [],
      [remote(1, { state: 'saved', state_changed_at: T(5) })],
    );
    assert.equal(kept?.plan, 'going');
  });

  it('merges registered and the answer separately from the plan state', () => {
    const [entry] = mergePlans(
      [
        local(1, {
          plan: 'going',
          stateChangedAt: T(9),
          registered: false,
          registeredChangedAt: T(1),
        }),
      ],
      [],
      [
        remote(1, {
          state: 'saved',
          state_changed_at: T(5),
          registered: true,
          registered_changed_at: T(6),
          attended: true,
          attended_changed_at: T(7),
        }),
      ],
    );
    assert.equal(entry?.plan, 'going');
    assert.equal(entry?.registered, true);
    assert.equal(entry?.attended, true);
    assert.equal(entry?.attendedAt, T(7));
  });

  it('a removal wins over an older plan, on either side', () => {
    assert.deepEqual(
      mergePlans(
        [local(1, { stateChangedAt: T(1) })],
        [],
        [remote(1, { removed_at: T(4) })],
      ),
      [],
    );
    assert.deepEqual(
      mergePlans(
        [],
        [{ id: id(1), removedAt: T(4) }],
        [remote(1, { state_changed_at: T(1) })],
      ),
      [],
    );
    assert.deepEqual(
      ids(
        mergePlans(
          [],
          [{ id: id(1), removedAt: T(1) }],
          [remote(1, { state_changed_at: T(4) })],
        ),
      ),
      [id(1)],
      'a newer save elsewhere brings it back',
    );
  });

  it('keeps the private note, and answers given before change times existed', () => {
    const [entry] = mergePlans(
      [local(1, { attended: true, attendedAt: T(1), note: 'Mine' })],
      [],
      [remote(1, { state_changed_at: T(5) })],
    );
    assert.equal(entry?.note, 'Mine');
    assert.equal(entry?.attended, true);
  });

  it('ignores an account copy that does not describe the event', () => {
    const [entry] = mergePlans([], [], [remote(4, { snapshot: {} })]);
    assert.equal(entry?.snapshot, null);
  });
});

describe('what is sent', () => {
  it('sends plans and removals without notes', () => {
    const payload = toSyncPayload(
      [local(1, { attended: true, attendedChangedAt: T(2), note: 'secret' })],
      [{ id: id(2), removedAt: T(3) }],
    );
    assert.equal(JSON.stringify(payload).includes('secret'), false);
    assert.deepEqual(
      payload.map((p) => [p.event_id, p.state]),
      [
        [id(1), 'saved'],
        [id(2), null],
      ],
    );
  });

  it('dates plans saved before change times existed by when they were saved', () => {
    const [plan] = toSyncPayload(
      [local(1, { stateChangedAt: null, savedAt: T(3) })],
      [],
    );
    assert.equal(plan?.state_changed_at, T(3));
  });

  it('sends answers and ticks recorded before change times existed', () => {
    const [plan] = toSyncPayload(
      [local(1, { attended: true, attendedAt: T(2), registered: true })],
      [],
    );
    assert.equal(plan?.attended_changed_at, T(2));
    assert.equal(plan?.registered_changed_at, '1970-01-01T00:00:00.000Z');
  });

  it('leaves out ids the server cannot know', () => {
    assert.deepEqual(toSyncPayload([local(1, { id: 'old-id' })], []), []);
  });
});

describe('merging the profile', () => {
  const profile = (updatedAt: string, interest: string) =>
    ({
      schemaVersion: 2,
      area: null,
      format: null,
      interestIds: [interest],
      goalIds: [],
      onboardingCompletedAt: null,
      updatedAt,
    }) as LocalDiscoveryProfile;

  it('keeps the most recent edit', () => {
    const now = new Date(T(30));
    assert.equal(
      mergeProfile(
        profile(T(1), 'technology'),
        { discovery: profile(T(2), 'health'), updated_at: T(2) },
        now,
      )?.interestIds[0],
      'health',
    );
    assert.equal(
      mergeProfile(
        profile(T(3), 'technology'),
        { discovery: profile(T(2), 'health'), updated_at: T(2) },
        now,
      )?.interestIds[0],
      'technology',
    );
    assert.equal(mergeProfile(null, null, now), null);
  });
});
