import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { searchCities } from '../config/discovery/cities.ts';
import {
  applyProfilePatch,
  effectiveFormat,
  emptyProfile,
  hasDiscoverySignals,
  parseStoredProfile,
} from './discovery-profile.ts';
import {
  createDiscoveryProfileStore,
  ENTRY_KEY,
  PROFILE_KEY,
} from './discovery-profile-store.ts';
import { memoryStore } from './key-value-store.ts';

const NOW = new Date('2026-10-03T10:00:00Z');
const clock = () => NOW;

describe('discovery profile rules', () => {
  it('starts with nothing selected', () => {
    const profile = emptyProfile(NOW);
    assert.equal(profile.area, null);
    assert.equal(profile.format, null);
    assert.deepEqual(profile.interestIds, []);
    assert.deepEqual(profile.goalIds, []);
    assert.equal(hasDiscoverySignals(profile), false);
  });

  it('merges a patch without completing onboarding', () => {
    const next = applyProfilePatch(
      emptyProfile(NOW),
      { interestIds: ['technology', 'technology', 'finance'] },
      NOW,
    );
    assert.deepEqual(next.interestIds, ['technology', 'finance']);
    assert.equal(next.onboardingCompletedAt, null);
    assert.equal(hasDiscoverySignals(next), true);
  });

  it('treats online-only discovery as the online format', () => {
    const profile = applyProfilePatch(
      emptyProfile(NOW),
      { area: { kind: 'online_only' }, format: 'in_person' },
      NOW,
    );
    assert.equal(effectiveFormat(profile), 'online');
  });

  it('migrates a version 1 profile and its renamed ids', () => {
    const migrated = parseStoredProfile(
      {
        schemaVersion: 1,
        onboardingCompletedAt: '2026-09-01T10:00:00Z',
        location: { cityId: 'buea', cityName: 'Buea', mode: 'manual' },
        formats: ['in_person', 'hybrid'],
        interestIds: ['healthcare', 'engineering', 'technology'],
        goalIds: ['advance_career', 'unknown'],
        locale: 'en',
      },
      NOW,
    );
    assert.deepEqual(migrated?.area, {
      kind: 'city',
      city: { id: 'buea', name: 'Buea' },
    });
    assert.equal(migrated?.format, 'in_person');
    assert.deepEqual(migrated?.interestIds, ['health', 'technology']);
    assert.deepEqual(migrated?.goalIds, ['find_work']);
    assert.equal(migrated?.onboardingCompletedAt, '2026-09-01T10:00:00Z');
  });

  it('drops the v1 "other city" placeholder instead of guessing a city', () => {
    const migrated = parseStoredProfile(
      { schemaVersion: 1, location: { cityId: 'other' }, formats: [] },
      NOW,
    );
    assert.equal(migrated?.area, null);
    assert.equal(migrated?.format, null);
  });

  it('rejects unreadable data', () => {
    assert.equal(parseStoredProfile(null, NOW), null);
    assert.equal(parseStoredProfile({ schemaVersion: 9 }, NOW), null);
    assert.equal(
      parseStoredProfile({ schemaVersion: 2, area: 'Douala' }, NOW),
      null,
    );
  });
});

describe('discovery profile store', () => {
  it('saves each step and completes only when asked', async () => {
    const kv = memoryStore();
    const store = createDiscoveryProfileStore(kv, clock);

    await store.update({
      area: { kind: 'city', city: { id: 'douala', name: 'Douala' } },
    });
    assert.equal(await store.hasEntered(), false);
    assert.equal((await store.load())?.onboardingCompletedAt, null);

    await store.update({ goalIds: ['meet_people'] });
    const done = await store.complete();
    assert.equal(done.onboardingCompletedAt, NOW.toISOString());
    assert.equal(done.area?.kind, 'city');
    assert.deepEqual(done.goalIds, ['meet_people']);
    assert.equal(await store.hasEntered(), true);
  });

  it('remembers "Explore first" without creating a profile', async () => {
    const kv = memoryStore();
    const store = createDiscoveryProfileStore(kv, clock);
    await store.markEntered();
    assert.equal(await store.hasEntered(), true);
    assert.equal(await store.load(), null);
    assert.ok(kv.data.has(ENTRY_KEY));
  });

  it('treats a completed v1 profile as having entered', async () => {
    const kv = memoryStore({
      [PROFILE_KEY]: JSON.stringify({
        schemaVersion: 1,
        onboardingCompletedAt: '2026-09-01T10:00:00Z',
        location: { cityId: 'yaounde' },
        formats: ['in_person', 'virtual'],
        interestIds: [],
        goalIds: [],
      }),
    });
    assert.equal(
      await createDiscoveryProfileStore(kv, clock).hasEntered(),
      true,
    );
  });

  it('reports a failed write instead of pretending it saved', async () => {
    const kv = memoryStore();
    kv.setItem = async () => {
      throw new Error('disk full');
    };
    const store = createDiscoveryProfileStore(kv, clock);
    await assert.rejects(store.update({ interestIds: ['finance'] }));
  });

  it('reads corrupt storage as no profile', async () => {
    const kv = memoryStore({ [PROFILE_KEY]: '{not json' });
    assert.equal(await createDiscoveryProfileStore(kv, clock).load(), null);
  });
});

describe('searchCities', () => {
  it('ignores accents and case, prefix matches first', () => {
    assert.deepEqual(
      searchCities('ngaoun').map((c) => c.id),
      ['ngaoundere'],
    );
    assert.equal(searchCities('EDEA')[0]?.name, 'Edéa');
    const ba = searchCities('ba').map((c) => c.id);
    assert.equal(ba[0], 'bamenda');
    assert.ok(ba.includes('abong_mbang'));
    assert.ok(ba.indexOf('bafoussam') < ba.indexOf('abong_mbang'));
  });

  it('returns nothing for an empty query', () => {
    assert.deepEqual(searchCities('   '), []);
  });
});
