import type { EventCardData } from '../types/event.type.ts';
import type { KeyValueStore } from './key-value-store.ts';

export const HIDDEN_EVENTS_KEY = 'meyalo.hiddenEvents.v1';

/** The optional one-tap answer to "Not interested". */
export type HiddenReason =
  | 'not_my_topic'
  | 'too_far'
  | 'wrong_time'
  | 'too_expensive';

export const HIDDEN_REASONS: readonly HiddenReason[] = [
  'not_my_topic',
  'too_far',
  'wrong_time',
  'too_expensive',
];

/** What the Hidden list and the ranking need, nothing more. */
export type HiddenSnapshot = Pick<
  EventCardData,
  | 'title'
  | 'startsAt'
  | 'timezone'
  | 'organizerName'
  | 'topics'
  | 'priceType'
  | 'format'
  | 'city'
>;

export interface HiddenEntry {
  id: string;
  hiddenAt: string;
  reason: HiddenReason | null;
  snapshot: HiddenSnapshot;
}

export type HiddenEventsErrorKind = 'read' | 'corrupt' | 'write';

/** A hide is never reported as done unless it was written. */
export class HiddenEventsError extends Error {
  readonly kind: HiddenEventsErrorKind;

  constructor(kind: HiddenEventsErrorKind, message: string) {
    super(message);
    this.name = 'HiddenEventsError';
    this.kind = kind;
  }
}

export interface HiddenEventsStore {
  list(): Promise<HiddenEntry[]>;
  /** Idempotent: hiding a hidden event keeps the first entry. */
  hide(event: EventCardData): Promise<HiddenEntry[]>;
  /** No-op for an event that is not hidden. */
  setReason(id: string, reason: HiddenReason | null): Promise<HiddenEntry[]>;
  restore(id: string): Promise<HiddenEntry[]>;
}

function toSnapshot(event: EventCardData): HiddenSnapshot {
  return {
    title: event.title,
    startsAt: event.startsAt,
    timezone: event.timezone,
    organizerName: event.organizerName,
    topics: event.topics,
    priceType: event.priceType,
    format: event.format,
    city: event.city,
  };
}

function isEntry(value: unknown): value is HiddenEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== 'string' || typeof entry.hiddenAt !== 'string') {
    return false;
  }
  if (
    entry.reason !== null &&
    !HIDDEN_REASONS.includes(entry.reason as HiddenReason)
  ) {
    return false;
  }
  if (!entry.snapshot || typeof entry.snapshot !== 'object') return false;
  const snapshot = entry.snapshot as Record<string, unknown>;
  return (
    typeof snapshot.title === 'string' &&
    typeof snapshot.startsAt === 'string' &&
    Array.isArray(snapshot.topics)
  );
}

function corrupt(): HiddenEventsError {
  return new HiddenEventsError('corrupt', 'Hidden events are unreadable.');
}

/**
 * Events marked "Not interested" on this phone. Like saved events, corrupt
 * storage is reported rather than replaced.
 */
export function createHiddenEventsStore(
  store: KeyValueStore,
  now: () => Date = () => new Date(),
): HiddenEventsStore {
  async function list(): Promise<HiddenEntry[]> {
    let json: string | null;
    try {
      json = await store.getItem(HIDDEN_EVENTS_KEY);
    } catch {
      throw new HiddenEventsError('read', 'Hidden events could not be read.');
    }
    if (json === null) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw corrupt();
    }
    if (!Array.isArray(parsed) || !parsed.every(isEntry)) throw corrupt();
    return parsed;
  }

  async function write(entries: HiddenEntry[]): Promise<HiddenEntry[]> {
    try {
      await store.setItem(HIDDEN_EVENTS_KEY, JSON.stringify(entries));
    } catch {
      throw new HiddenEventsError('write', 'Hidden events could not be saved.');
    }
    return entries;
  }

  return {
    list,
    async hide(event) {
      const entries = await list();
      if (entries.some((entry) => entry.id === event.id)) return entries;
      return write([
        ...entries,
        {
          id: event.id,
          hiddenAt: now().toISOString(),
          reason: null,
          snapshot: toSnapshot(event),
        },
      ]);
    },
    async setReason(id, reason) {
      const entries = await list();
      if (!entries.some((entry) => entry.id === id)) return entries;
      return write(
        entries.map((entry) =>
          entry.id === id ? { ...entry, reason } : entry,
        ),
      );
    },
    async restore(id) {
      const entries = await list();
      if (!entries.some((entry) => entry.id === id)) return entries;
      return write(entries.filter((entry) => entry.id !== id));
    },
  };
}
