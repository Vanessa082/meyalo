import type { EventCardData } from '../types/event.type.ts';
import type { KeyValueStore } from './key-value-store.ts';

/**
 * Events opened on this phone, a weak "interested" signal for For You
 * (docs/product-decisions.md, what "intelligent" means). Never leaves the
 * phone; keeps only what the ranking needs.
 */

export const OPENED_EVENTS_KEY = 'meyalo.openedEvents.v1';
const MAX_ENTRIES = 200;
/** Coming back to the same event within this time is one open. */
const SAME_VISIT_MS = 30 * 60 * 1000;

export interface OpenedEntry {
  id: string;
  openedAt: string;
  topics: string[];
  organizerName: string;
  startsAt: string;
  timezone: string;
}

export class OpenedEventsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenedEventsError';
  }
}

export interface OpenedEventsStore {
  list(): Promise<OpenedEntry[]>;
  record(event: EventCardData): Promise<OpenedEntry[]>;
  /** Deletes the whole history (learning switched off). */
  clear(): Promise<void>;
}

function isEntry(value: unknown): value is OpenedEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.openedAt === 'string' &&
    Array.isArray(entry.topics) &&
    typeof entry.organizerName === 'string' &&
    typeof entry.startsAt === 'string' &&
    typeof entry.timezone === 'string'
  );
}

export function createOpenedEventsStore(
  store: KeyValueStore,
  now: () => Date = () => new Date(),
): OpenedEventsStore {
  async function list(): Promise<OpenedEntry[]> {
    let json: string | null;
    try {
      json = await store.getItem(OPENED_EVENTS_KEY);
    } catch {
      throw new OpenedEventsError('Opened events could not be read.');
    }
    if (json === null) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new OpenedEventsError('Opened events are unreadable.');
    }
    if (!Array.isArray(parsed) || !parsed.every(isEntry)) {
      throw new OpenedEventsError('Opened events are unreadable.');
    }
    return parsed;
  }

  return {
    list,
    async clear() {
      try {
        await store.removeItem(OPENED_EVENTS_KEY);
      } catch {
        throw new OpenedEventsError('Opened events could not be deleted.');
      }
    },
    async record(event) {
      const entries = await list();
      const at = now();
      const last = [...entries].reverse().find((e) => e.id === event.id);
      if (last && at.getTime() - Date.parse(last.openedAt) < SAME_VISIT_MS) {
        return entries;
      }
      const next = [
        ...entries,
        {
          id: event.id,
          openedAt: at.toISOString(),
          topics: event.topics,
          organizerName: event.organizerName,
          startsAt: event.startsAt,
          timezone: event.timezone,
        },
      ].slice(-MAX_ENTRIES);
      try {
        await store.setItem(OPENED_EVENTS_KEY, JSON.stringify(next));
      } catch {
        throw new OpenedEventsError('Opened events could not be saved.');
      }
      return next;
    },
  };
}
