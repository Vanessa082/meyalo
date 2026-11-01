import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import { parseStoredProfile } from './discovery-profile.ts';
import type {
  PlanRemoval,
  SavedEntry,
  SavedEventSnapshot,
} from './saved-events-store.ts';

/**
 * Backing up plans to an account (docs/product-decisions.md, "Spec:
 * accounts"). Pure: the same rule as `sync_account` in 013_accounts.sql. For
 * one event each field keeps its latest change: the plan state (or its
 * removal), registered, and the "Did you go?" answer. Notes never leave the
 * phone.
 */

/** A plan as `sync_account` returns it. */
export interface RemotePlan {
  event_id: string;
  state: 'saved' | 'going';
  state_changed_at: string;
  removed_at: string | null;
  registered: boolean;
  registered_changed_at: string | null;
  attended: boolean | null;
  attended_changed_at: string | null;
  snapshot: Record<string, unknown> | null;
}

/** A plan as `sync_account` takes it; state null is a removal. */
export interface SyncPlan {
  event_id: string;
  state: 'saved' | 'going' | null;
  state_changed_at: string;
  registered?: boolean;
  registered_changed_at?: string;
  attended?: boolean | null;
  attended_changed_at?: string;
  snapshot?: SavedEventSnapshot;
}

export interface RemoteProfile {
  discovery: unknown;
  updated_at: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Plans saved before change times existed count as old as their save. */
const EPOCH = '1970-01-01T00:00:00.000Z';

const ms = (iso: string | null | undefined) =>
  iso ? Date.parse(iso) : Number.NEGATIVE_INFINITY;

function stateTime(entry: SavedEntry): string {
  return entry.stateChangedAt ?? entry.savedAt ?? EPOCH;
}

/** Ticks made before change times existed count as old, not as unset. */
function registeredTime(entry: SavedEntry): string | null {
  return entry.registeredChangedAt ?? (entry.registered ? EPOCH : null);
}

/** An answer given before change times existed is dated by the answer. */
function attendedTime(entry: SavedEntry): string | null {
  return entry.attendedChangedAt ?? entry.attendedAt;
}

export function toSyncPayload(
  entries: readonly SavedEntry[],
  removals: readonly PlanRemoval[],
): SyncPlan[] {
  const plans: SyncPlan[] = entries
    .filter((entry) => UUID.test(entry.id))
    .map((entry) => {
      const registeredAt = registeredTime(entry);
      const attendedAt = attendedTime(entry);
      return {
        event_id: entry.id,
        state: entry.plan,
        state_changed_at: stateTime(entry),
        ...(registeredAt
          ? {
              registered: entry.registered,
              registered_changed_at: registeredAt,
            }
          : {}),
        ...(attendedAt
          ? { attended: entry.attended, attended_changed_at: attendedAt }
          : {}),
        ...(entry.snapshot ? { snapshot: entry.snapshot } : {}),
      };
    });
  const removed: SyncPlan[] = removals
    .filter((item) => UUID.test(item.id))
    .map((item) => ({
      event_id: item.id,
      state: null,
      state_changed_at: item.removedAt,
    }));
  return [...plans, ...removed];
}

/** The account's copy of the event, when it really describes this event. */
function remoteSnapshot(plan: RemotePlan): SavedEventSnapshot | null {
  const snapshot = plan.snapshot;
  return snapshot &&
    snapshot.id === plan.event_id &&
    typeof snapshot.title === 'string' &&
    typeof snapshot.startsAt === 'string'
    ? (snapshot as unknown as SavedEventSnapshot)
    : null;
}

function fromRemote(plan: RemotePlan): SavedEntry {
  return {
    id: plan.event_id,
    savedAt: plan.state_changed_at,
    snapshot: remoteSnapshot(plan),
    plan: plan.state,
    registered: plan.registered,
    attended: plan.attended,
    attendedAt: plan.attended === null ? null : plan.attended_changed_at,
    note: null,
    stateChangedAt: plan.state_changed_at,
    registeredChangedAt: plan.registered_changed_at,
    attendedChangedAt: plan.attended_changed_at,
  };
}

/**
 * The plans this phone should hold after a backup. Ties keep this phone's
 * version. The result keeps this phone's order, then new plans by time.
 */
export function mergePlans(
  local: readonly SavedEntry[],
  removals: readonly PlanRemoval[],
  remote: readonly RemotePlan[],
): SavedEntry[] {
  const remoteById = new Map(remote.map((plan) => [plan.event_id, plan]));
  const removedById = new Map(
    removals.map((item) => [item.id, item.removedAt]),
  );
  const ordered = [
    ...local.map((entry) => entry.id),
    ...[...remote]
      .sort((a, b) => ms(a.state_changed_at) - ms(b.state_changed_at))
      .map((plan) => plan.event_id),
    ...removals.map((item) => item.id),
  ];

  const merged: SavedEntry[] = [];
  const seen = new Set<string>();
  for (const id of ordered) {
    if (seen.has(id)) continue;
    seen.add(id);
    const mine = local.find((entry) => entry.id === id);
    const theirs = remoteById.get(id);

    // When each side last changed whether the plan exists.
    const localTime = mine ? ms(stateTime(mine)) : ms(removedById.get(id));
    const localPresent = Boolean(mine);
    const remoteRemoved =
      theirs?.removed_at != null &&
      ms(theirs.removed_at) > ms(theirs.state_changed_at);
    const remoteTime = theirs
      ? remoteRemoved
        ? ms(theirs.removed_at)
        : ms(theirs.state_changed_at)
      : Number.NEGATIVE_INFINITY;

    const remoteWins = Boolean(theirs) && remoteTime > localTime;
    const present = remoteWins ? !remoteRemoved : localPresent;
    if (!present) continue;

    const base =
      remoteWins && theirs ? fromRemote(theirs) : (mine as SavedEntry);
    const other = remoteWins ? mine : theirs ? fromRemote(theirs) : undefined;
    let entry: SavedEntry = {
      ...base,
      snapshot: base.snapshot ?? other?.snapshot ?? null,
      note: mine?.note ?? null,
      registeredChangedAt: registeredTime(base),
      attendedChangedAt: attendedTime(base),
    };
    if (other && ms(registeredTime(other)) > ms(entry.registeredChangedAt)) {
      entry = {
        ...entry,
        registered: other.registered,
        registeredChangedAt: registeredTime(other),
      };
    }
    if (other && ms(attendedTime(other)) > ms(entry.attendedChangedAt)) {
      entry = {
        ...entry,
        attended: other.attended,
        attendedAt: other.attendedAt,
        attendedChangedAt: attendedTime(other),
      };
    }
    // "No" and "taken back" drop the note, as on the phone.
    if (entry.attended !== true) entry = { ...entry, note: null };
    merged.push(entry);
  }
  return merged;
}

/** The most recent edit of the profile wins; an unreadable one is ignored. */
export function mergeProfile(
  local: LocalDiscoveryProfile | null,
  remote: RemoteProfile | null,
  now: Date,
): LocalDiscoveryProfile | null {
  const theirs =
    remote?.discovery && remote.updated_at
      ? parseStoredProfile(remote.discovery, now)
      : null;
  if (!theirs) return local;
  if (!local) return theirs;
  return ms(theirs.updatedAt) > ms(local.updatedAt) ? theirs : local;
}
