import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import type { EventCardData } from '../types/event.type.ts';
import type { AccountSnapshot } from './account.ts';
import { syncAccount } from './account-sync.ts';
import { createDiscoveryProfileStore } from './discovery-profile-store.ts';
import { memoryStore } from './key-value-store.ts';
import type { SyncPlan } from './plan-sync.ts';
import { createSavedEventsStore } from './saved-events-store.ts';

const NOW = new Date('2026-10-20T10:00:00Z');
const id = (n: number) => `e1000000-0000-4000-8000-00000000000${n}`;

function event(n: number): EventCardData {
  return {
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
  };
}

function setup(answer: (plans: readonly SyncPlan[]) => AccountSnapshot) {
  const saved = createSavedEventsStore(memoryStore(), () => NOW);
  const profiles = createDiscoveryProfileStore(memoryStore(), () => NOW);
  const sent: { plans: readonly SyncPlan[]; profile: unknown }[] = [];
  const account = {
    sync: async (plans: readonly SyncPlan[], profile: unknown) => {
      sent.push({ plans, profile });
      return answer(plans);
    },
  };
  return { saved, profiles, account, sent };
}

describe('one backup', () => {
  it('sends this phone and keeps the union the account returns', async () => {
    const { saved, profiles, account, sent } = setup(() => ({
      plans: [
        {
          event_id: id(4),
          state: 'going',
          state_changed_at: '2026-10-19T08:00:00Z',
          removed_at: null,
          registered: false,
          registered_changed_at: null,
          attended: null,
          attended_changed_at: null,
          snapshot: event(4) as unknown as Record<string, unknown>,
        },
      ],
      profile: null,
    }));
    for (const n of [1, 2, 3]) await saved.setSaved(event(n), true);
    const result = await syncAccount({
      account,
      saved,
      profiles,
      now: () => NOW,
    });
    assert.equal(sent[0]?.plans.length, 3);
    assert.deepEqual(result.entries.map((e) => e.id).sort(), [
      id(1),
      id(2),
      id(3),
      id(4),
    ]);
    assert.equal((await saved.list()).length, 4);
  });

  it('keeps a change made on this phone while the backup was on its way', async () => {
    const { saved, profiles, account } = setup(() => ({
      plans: [],
      profile: null,
    }));
    await saved.setSaved(event(1), true);
    const original = account.sync;
    account.sync = async (plans, profile) => {
      // The person saves another event during the request.
      await saved.setSaved(event(2), true);
      return original(plans, profile);
    };
    await syncAccount({ account, saved, profiles, now: () => NOW });
    assert.deepEqual((await saved.list()).map((e) => e.id).sort(), [
      id(1),
      id(2),
    ]);
  });

  it('restores a newer profile from the account, and sends a newer local one', async () => {
    const restored: LocalDiscoveryProfile = {
      schemaVersion: 2,
      area: null,
      format: 'online',
      interestIds: ['health'],
      goalIds: [],
      onboardingCompletedAt: '2026-10-19T08:00:00Z',
      updatedAt: '2026-10-19T08:00:00Z',
    };
    const fresh = setup(() => ({
      plans: [],
      profile: { discovery: restored, updated_at: restored.updatedAt },
    }));
    await syncAccount({ ...fresh, now: () => NOW });
    assert.deepEqual((await fresh.profiles.load())?.interestIds, ['health']);

    const local = setup(() => ({ plans: [], profile: null }));
    await local.profiles.update({ interestIds: ['technology'] });
    await syncAccount({ ...local, now: () => NOW });
    const sentProfile = local.sent[0]?.profile as
      | { discovery: LocalDiscoveryProfile }
      | undefined;
    assert.deepEqual(sentProfile?.discovery.interestIds, ['technology']);
  });

  it('changes nothing on this phone when the backup fails', async () => {
    const { saved, profiles, account } = setup(() => {
      throw new Error('offline');
    });
    await saved.setSaved(event(1), true);
    await saved.setSaved(event(2), true);
    await saved.setSaved(event(2), false);
    await assert.rejects(
      syncAccount({ account, saved, profiles, now: () => NOW }),
    );
    assert.equal((await saved.list()).length, 1);
    assert.equal(
      (await saved.removals()).length,
      1,
      'the removal is still to send',
    );
  });
});
