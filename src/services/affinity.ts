import { REGION } from '../config/region.ts';
import type { EventCardData } from '../types/event.type.ts';
import { eventSpan } from './event-time.ts';
import { samePlace } from './geo.ts';
import type { HiddenEntry } from './hidden-events-store.ts';
import type { OpenedEntry } from './opened-events-store.ts';
import { zonedDay } from './zoned-time.ts';

/**
 * Learned affinity (docs/product-decisions.md, Feature 3 and the Feature 5
 * spec): what the user did on this phone nudges the order of their matches.
 * It never decides what may appear; the ranking's hard rules do that.
 */

export interface AffinitySignals {
  /** Saved and Going events (their saved copy). */
  saved: readonly {
    topics: readonly string[];
    organizerName: string;
    /** Absent for saves made before plan states: Saved. */
    plan?: 'saved' | 'going';
    savedAt?: string | null;
    startsAt?: string;
    endsAt?: string;
    timezone?: string;
    /** "Did you go?": null or absent until answered. */
    attended?: boolean | null;
    attendedAt?: string | null;
  }[];
  hidden: readonly HiddenEntry[];
  /** Events opened on this phone. */
  opened?: readonly OpenedEntry[];
  /** When given, older signals fade (half every 60 days). */
  now?: Date;
}

export interface Affinity {
  /** From -1 (avoid) to 1 (seek out); 0 when nothing is known. */
  score(event: EventCardData): number;
  /** In person, in a city the user said was too far. */
  isTooFar(event: EventCardData): boolean;
  /** Learned habits clearly lifted this event (shown as a reason). */
  isHabit(event: EventCardData): boolean;
}

/** How much each kind of signal counts (docs/product-decisions.md). */
const SIGNAL = {
  saved: 1,
  going: 1.5,
  attended: 2,
  opened: 0.5,
  notMyTopic: -1,
} as const;
/** A Going event nobody answered "Did you go?" for stops counting. */
const UNANSWERED_DAYS = 14;
const HALF_LIFE_DAYS = 60;
/** At least one strong habit, e.g. two saves of the topic. */
const HABIT_THRESHOLD = 1 / 3;

/** One habit can move a group this far and no further. */
const GROUP_CAP = 3;

export function buildAffinity(signals: AffinitySignals): Affinity {
  const topics = new Map<string, number>();
  const organizers = new Map<string, number>();
  const slots = new Map<string, number>();
  const add = (map: Map<string, number>, key: string, delta: number) =>
    map.set(key, (map.get(key) ?? 0) + delta);

  // Recent behaviour leads: a signal loses half its weight every 60 days.
  const fade = (at: string | null | undefined) => {
    if (!signals.now || !at) return 1;
    const days = (signals.now.getTime() - Date.parse(at)) / 86_400_000;
    return days > 0 ? 0.5 ** (days / HALF_LIFE_DAYS) : 1;
  };

  const learn = (
    item: {
      topics: readonly string[];
      organizerName: string;
      startsAt?: string;
      timezone?: string;
    },
    weight: number,
  ) => {
    for (const topic of item.topics) add(topics, topic, weight);
    add(organizers, organizerKey(item.organizerName), weight);
    const slot = item.startsAt
      ? timeSlot(item.startsAt, item.timezone ?? '')
      : null;
    if (slot) add(slots, slot, weight);
  };

  for (const saved of signals.saved) {
    if (saved.attended === true) {
      learn(saved, SIGNAL.attended * fade(saved.attendedAt));
      continue;
    }
    // "No" is neutral: the interest shown by saving stays as it was.
    if (
      saved.attended == null &&
      saved.plan === 'going' &&
      signals.now &&
      saved.startsAt
    ) {
      const { end } = eventSpan({
        startsAt: saved.startsAt,
        endsAt: saved.endsAt,
      });
      if (signals.now.getTime() - end > UNANSWERED_DAYS * 86_400_000) continue;
    }
    const base = saved.plan === 'going' ? SIGNAL.going : SIGNAL.saved;
    learn(saved, base * fade(saved.savedAt));
  }
  for (const opened of signals.opened ?? []) {
    learn(opened, SIGNAL.opened * fade(opened.openedAt));
  }

  let tooExpensive = 0;
  const farCities: string[] = [];

  for (const { reason, snapshot, hiddenAt } of signals.hidden) {
    const weight = fade(hiddenAt);
    switch (reason) {
      case 'not_my_topic':
        for (const topic of snapshot.topics) {
          add(topics, topic, SIGNAL.notMyTopic * weight);
        }
        add(
          organizers,
          organizerKey(snapshot.organizerName),
          SIGNAL.notMyTopic * weight,
        );
        break;
      case 'too_expensive':
        tooExpensive += 1;
        break;
      case 'wrong_time': {
        const slot = timeSlot(snapshot.startsAt, snapshot.timezone);
        if (slot) add(slots, slot, -weight);
        break;
      }
      case 'too_far':
        if (snapshot.city) farCities.push(snapshot.city);
        break;
      case null:
        break;
    }
  }

  const tooFarCount = (event: EventCardData) =>
    event.format === 'in_person' && event.city
      ? farCities.filter((city) => samePlace(city, event.city ?? '')).length
      : 0;

  function score(event: EventCardData): number {
    let raw = 0;
    for (const topic of event.topics) raw += capped(topics.get(topic));
    raw += capped(organizers.get(organizerKey(event.organizerName)));
    if (event.priceType === 'paid') raw -= Math.min(tooExpensive, GROUP_CAP);
    const slot = timeSlot(event.startsAt, event.timezone);
    if (slot) raw += capped(slots.get(slot));
    raw -= Math.min(tooFarCount(event), GROUP_CAP);
    // `|| 0` turns -0 into 0 so "no effect" compares equal to zero.
    return Math.max(-1, Math.min(1, raw / GROUP_CAP)) || 0;
  }

  return {
    score,
    isTooFar: (event) => tooFarCount(event) > 0,
    isHabit: (event) => score(event) >= HABIT_THRESHOLD,
  };
}

function capped(value = 0): number {
  return Math.max(-GROUP_CAP, Math.min(GROUP_CAP, value));
}

function organizerKey(name: string): string {
  return name.trim().toLowerCase();
}

/** "weekday-evening", "weekend-morning", …, in the event's timezone. */
function timeSlot(startsAt: string, timezone: string): string | null {
  const day = zonedDay(startsAt, timezone || REGION.timeZone);
  if (!day) return null;
  const week = day.weekday === 0 || day.weekday === 6 ? 'weekend' : 'weekday';
  const part =
    day.hour < 12 ? 'morning' : day.hour < 17 ? 'afternoon' : 'evening';
  return `${week}-${part}`;
}
