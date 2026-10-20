import type { EventCardData } from '../types/event.type.ts';
import { eventSpan } from './event-time.ts';
import type { KeyValueStore } from './key-value-store.ts';

export const SAVED_EVENTS_KEY = 'meyalo.savedEvents.v2';
/** Ids only, before snapshots existed. Read and migrated, never written. */
export const LEGACY_SAVED_EVENTS_KEY = 'meyalo_saved_event_ids';
/** Plans taken off this phone, with when, so a backup can remove them too. */
export const REMOVED_PLANS_KEY = 'meyalo.removedPlans.v1';

export interface PlanRemoval {
  id: string;
  removedAt: string;
}

const MAX_REMOVALS = 500;

/** The card without long or context-dependent fields. */
export type SavedEventSnapshot = Omit<
  EventCardData,
  'description' | 'relevanceReasons' | 'distanceKm' | 'distanceText' | 'isSaved'
>;

export interface SavedEntry {
  id: string;
  /** Null for saves migrated from the id-only format. */
  savedAt: string | null;
  /** What the event looked like when saved, so My Month works offline and
   *  after the event leaves the feed. Null for migrated saves. */
  snapshot: SavedEventSnapshot | null;
  /** Saved: considering. Going: committed (docs/product-decisions.md,
   *  Feature 10). Entries written before plan states read as Saved. */
  plan: PlanState;
  /** Ticked "I've registered": hides its registration deadline. */
  registered: boolean;
  /** "Did you go?" after the event: null until answered. */
  attended: boolean | null;
  attendedAt: string | null;
  /** When each field last changed, so phones sharing an account keep the
   *  latest change of each (null before these were recorded). */
  stateChangedAt: string | null;
  registeredChangedAt: string | null;
  attendedChangedAt: string | null;
  /** "What did you get out of it?", only after Yes. Never leaves the phone. */
  note: string | null;
}

export const NOTE_MAX = 500;

/** Plans are kept this long after the event ends, then removed. */
export const KEEP_AFTER_END_DAYS = 90;

export type PlanState = 'saved' | 'going';

export type SavedEventsErrorKind = 'read' | 'corrupt' | 'write' | 'invalid';

/** Saving is never reported as done unless it was written. */
export class SavedEventsError extends Error {
  readonly kind: SavedEventsErrorKind;

  constructor(kind: SavedEventsErrorKind, message: string) {
    super(message);
    this.name = 'SavedEventsError';
    this.kind = kind;
  }
}

export interface SavedEventsStore {
  list(): Promise<SavedEntry[]>;
  /** The bookmark. Idempotent; saving never downgrades a Going event. */
  setSaved(event: EventCardData, saved: boolean): Promise<SavedEntry[]>;
  /** Sets the plan state, or removes the event with null. Idempotent. */
  setPlan(event: EventCardData, plan: PlanState | null): Promise<SavedEntry[]>;
  /** No-op for an event that is not planned. */
  setRegistered(id: string, registered: boolean): Promise<SavedEntry[]>;
  /** Yes, No, or null to take the answer back. No removes the note. */
  setAttended(id: string, attended: boolean | null): Promise<SavedEntry[]>;
  /** Blank removes it. No-op unless the person said Yes. */
  setNote(id: string, note: string): Promise<SavedEntry[]>;
  /** Plans removed from this phone that a backup has not removed yet. */
  removals(): Promise<PlanRemoval[]>;
  /** Writes what a backup agreed on. Notes stay as they are on this phone;
   *  the removals that were sent are forgotten. */
  applySynced(
    entries: readonly SavedEntry[],
    sentRemovals: readonly PlanRemoval[],
  ): Promise<SavedEntry[]>;
}

function toSnapshot(event: EventCardData): SavedEventSnapshot {
  const {
    description: _description,
    relevanceReasons: _reasons,
    distanceKm: _km,
    distanceText: _distance,
    isSaved: _saved,
    ...snapshot
  } = event;
  return snapshot;
}

function corrupt(): SavedEventsError {
  return new SavedEventsError('corrupt', 'Saved events are unreadable.');
}

/** Stored entries may predate plan states; the defaults fill them in. */
type Defaulted =
  | 'plan'
  | 'registered'
  | 'attended'
  | 'attendedAt'
  | 'note'
  | 'stateChangedAt'
  | 'registeredChangedAt'
  | 'attendedChangedAt';
type StoredEntry = Omit<SavedEntry, Defaulted> &
  Partial<Pick<SavedEntry, Defaulted>>;

function withDefaults(entry: StoredEntry): SavedEntry {
  return {
    ...entry,
    plan: entry.plan ?? 'saved',
    registered: entry.registered ?? false,
    attended: entry.attended ?? null,
    attendedAt: entry.attendedAt ?? null,
    note: entry.note ?? null,
    stateChangedAt: entry.stateChangedAt ?? null,
    registeredChangedAt: entry.registeredChangedAt ?? null,
    attendedChangedAt: entry.attendedChangedAt ?? null,
  };
}

const optional = (value: unknown, type: 'boolean' | 'string') =>
  value === undefined || value === null || typeof value === type;

function isEntry(value: unknown): value is StoredEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  if (
    entry.plan !== undefined &&
    entry.plan !== 'saved' &&
    entry.plan !== 'going'
  ) {
    return false;
  }
  if (entry.registered !== undefined && typeof entry.registered !== 'boolean') {
    return false;
  }
  if (
    !optional(entry.attended, 'boolean') ||
    !optional(entry.attendedAt, 'string') ||
    !optional(entry.note, 'string') ||
    !optional(entry.stateChangedAt, 'string') ||
    !optional(entry.registeredChangedAt, 'string') ||
    !optional(entry.attendedChangedAt, 'string')
  ) {
    return false;
  }
  if (typeof entry.id !== 'string') return false;
  if (entry.savedAt !== null && typeof entry.savedAt !== 'string') return false;
  if (entry.snapshot === null) return true;
  if (!entry.snapshot || typeof entry.snapshot !== 'object') return false;
  const snapshot = entry.snapshot as Record<string, unknown>;
  return (
    snapshot.id === entry.id &&
    typeof snapshot.title === 'string' &&
    typeof snapshot.startsAt === 'string'
  );
}

/**
 * Saved events on this phone. Corrupt storage is reported, not replaced, so a
 * bug can never silently erase someone's plan.
 */
export function createSavedEventsStore(
  store: KeyValueStore,
  now: () => Date = () => new Date(),
): SavedEventsStore {
  async function read(key: string): Promise<unknown> {
    let json: string | null;
    try {
      json = await store.getItem(key);
    } catch {
      throw new SavedEventsError('read', 'Saved events could not be read.');
    }
    if (json === null) return null;
    try {
      return JSON.parse(json);
    } catch {
      throw corrupt();
    }
  }

  async function list(): Promise<SavedEntry[]> {
    const current = await read(SAVED_EVENTS_KEY);
    if (current !== null) {
      if (!Array.isArray(current) || !current.every(isEntry)) throw corrupt();
      return current.map(withDefaults);
    }
    const legacy = await read(LEGACY_SAVED_EVENTS_KEY);
    if (legacy === null) return [];
    if (
      !Array.isArray(legacy) ||
      !legacy.every((id): id is string => typeof id === 'string')
    ) {
      throw corrupt();
    }
    return legacy.map((id) =>
      withDefaults({ id, savedAt: null, snapshot: null }),
    );
  }

  function newEntry(event: EventCardData, plan: PlanState): SavedEntry {
    return {
      id: event.id,
      savedAt: now().toISOString(),
      snapshot: toSnapshot(event),
      plan,
      registered: false,
      attended: null,
      attendedAt: null,
      note: null,
      stateChangedAt: now().toISOString(),
      registeredChangedAt: null,
      attendedChangedAt: null,
    };
  }

  async function removals(): Promise<PlanRemoval[]> {
    const value = await read(REMOVED_PLANS_KEY);
    if (value === null) return [];
    if (
      !Array.isArray(value) ||
      !value.every(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.removedAt === 'string',
      )
    ) {
      throw corrupt();
    }
    return value as PlanRemoval[];
  }

  async function writeRemovals(next: PlanRemoval[]): Promise<void> {
    try {
      await store.setItem(
        REMOVED_PLANS_KEY,
        JSON.stringify(next.slice(-MAX_REMOVALS)),
      );
    } catch {
      throw new SavedEventsError('write', 'Saved events could not be written.');
    }
  }

  /** Remembers a removal, or forgets one when the event is planned again. */
  async function noteRemoval(id: string, removed: boolean): Promise<void> {
    const current = await removals();
    const others = current.filter((item) => item.id !== id);
    if (!removed && others.length === current.length) return;
    await writeRemovals(
      removed ? [...others, { id, removedAt: now().toISOString() }] : others,
    );
  }

  /** Still useful: not ended, or ended less than 90 days ago. Entries
   *  without a snapshot cannot be dated and stay. */
  function kept(entry: SavedEntry): boolean {
    if (!entry.snapshot) return true;
    const { end } = eventSpan(entry.snapshot);
    return (
      !Number.isFinite(end) ||
      now().getTime() - end < KEEP_AFTER_END_DAYS * 86_400_000
    );
  }

  async function update(
    id: string,
    change: (entry: SavedEntry) => SavedEntry,
  ): Promise<SavedEntry[]> {
    const entries = await list();
    const current = entries.find((entry) => entry.id === id);
    if (!current) return entries;
    const next = change(current);
    if (JSON.stringify(next) === JSON.stringify(current)) return entries;
    return write(entries.map((entry) => (entry.id === id ? next : entry)));
  }

  async function write(all: SavedEntry[]): Promise<SavedEntry[]> {
    const next = all.filter(kept);
    try {
      await store.setItem(SAVED_EVENTS_KEY, JSON.stringify(next));
    } catch {
      throw new SavedEventsError('write', 'Saved events could not be written.');
    }
    // Migration complete: the new key now holds every save. A failure here
    // only leaves a stale copy that the new key already shadows.
    await store.removeItem(LEGACY_SAVED_EVENTS_KEY).catch(() => {});
    return next;
  }

  return {
    list,
    async setSaved(event, saved) {
      const entries = await list();
      const has = entries.some((entry) => entry.id === event.id);
      if (has === saved) return entries;
      const next = await write(
        saved
          ? [...entries, newEntry(event, 'saved')]
          : entries.filter((entry) => entry.id !== event.id),
      );
      await noteRemoval(event.id, !saved);
      return next;
    },

    async setPlan(event, plan) {
      const entries = await list();
      const current = entries.find((entry) => entry.id === event.id);
      if ((current?.plan ?? null) === plan) return entries;
      if (plan === null) {
        const next = await write(
          entries.filter((entry) => entry.id !== event.id),
        );
        await noteRemoval(event.id, true);
        return next;
      }
      const next = await write(
        current
          ? entries.map((entry) =>
              entry.id === event.id
                ? {
                    ...entry,
                    plan,
                    snapshot: toSnapshot(event),
                    stateChangedAt: now().toISOString(),
                  }
                : entry,
            )
          : [...entries, newEntry(event, plan)],
      );
      if (!current) await noteRemoval(event.id, false);
      return next;
    },

    setRegistered: (id, registered) =>
      update(id, (entry) =>
        entry.registered === registered
          ? entry
          : { ...entry, registered, registeredChangedAt: now().toISOString() },
      ),

    setAttended: (id, attended) =>
      update(id, (entry) => ({
        ...entry,
        attended,
        attendedAt: attended === null ? null : now().toISOString(),
        attendedChangedAt: now().toISOString(),
        note: attended === true ? entry.note : null,
      })),

    removals,

    async applySynced(entries, sentRemovals) {
      const notes = new Map(
        (await list()).map((entry) => [entry.id, entry.note]),
      );
      const next = await write(
        entries.map((entry) => ({
          ...entry,
          note: notes.get(entry.id) ?? null,
        })),
      );
      const sent = new Set(
        sentRemovals.map((item) => `${item.id}@${item.removedAt}`),
      );
      const left = (await removals()).filter(
        (item) => !sent.has(`${item.id}@${item.removedAt}`),
      );
      await writeRemovals(left);
      return next;
    },

    async setNote(id, note) {
      const trimmed = note.trim();
      if (trimmed.length > NOTE_MAX) {
        throw new SavedEventsError(
          'invalid',
          `A note is at most ${NOTE_MAX} characters.`,
        );
      }
      return update(id, (entry) =>
        entry.attended === true
          ? { ...entry, note: trimmed === '' ? null : trimmed }
          : entry,
      );
    },
  };
}
