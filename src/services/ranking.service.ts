import { CITY_CENTERS } from '../config/discovery/cities.ts';
import { GOAL_OFFERS, type GoalId } from '../config/discovery/goals.ts';
import type { TopicId } from '../config/discovery/topics.ts';
import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import type { EventCardData } from '../types/event.type.ts';
import type { Affinity } from './affinity.ts';
import { effectiveFormat } from './discovery-profile.ts';
import { distanceKm, samePlace } from './geo.ts';
import { DAY_MS } from './zoned-time.ts';

/**
 * For You ranking (docs/product-decisions.md, Features 3 and 5).
 *
 * Deterministic and explainable: hard rules decide what may appear, then a
 * weighted score orders the matches. Runs on device; the profile never leaves
 * the phone. Learned affinity only reorders matches; see services/affinity.ts.
 */

/** Why an event was picked. The UI turns these into translated text. */
export type MatchReason =
  | { kind: 'topic'; topicId: TopicId }
  | { kind: 'goal'; goalId: GoalId }
  | { kind: 'soon' }
  /** Registration closes within a week. Listed first. */
  | { kind: 'deadline' }
  /** Learned habits lifted it. */
  | { kind: 'habit' };

export interface TopPick {
  event: EventCardData;
  reasons: MatchReason[];
}

export interface ForYouFeed {
  /** True when the profile has at least one usable signal. */
  personalized: boolean;
  /** Up to MAX_TOP_PICKS matches, at most one per organizer. */
  topPicks: TopPick[];
  /** Every other eligible event, soonest first. */
  moreUpcoming: EventCardData[];
  /** In-person events in other cities that match the profile, nearest first.
   *  `distanceKm` is set when both the user's city and the event are located. */
  beyondCity: EventCardData[];
}

const MAX_TOP_PICKS = 5;
const MAX_REASONS = 3;
/** Lower shows first; a sort keeps the original order within a kind. */
const REASON_PRIORITY: Record<MatchReason['kind'], number> = {
  deadline: 0,
  habit: 1,
  topic: 2,
  goal: 2,
  soon: 3,
};
/** Mix, not repeat: top picks sharing one topic. */
const MAX_PICKS_PER_TOPIC = 2;

const WEIGHTS = {
  interest: 35,
  goal: 30,
  timingThisWeek: 15,
  timingThisMonth: 8,
  organizerConfirmed: 5,
  sourceConfirmed: 3,
  /** Multiplies an affinity score between -1 and 1. */
  affinity: 15,
  /** A match whose registration closes within a week. */
  deadlineSoon: 12,
  /** Checked in the last 14 days, or not for 45. */
  freshCheck: 3,
  staleCheck: -3,
} as const;

const DEADLINE_SOON_MS = 7 * DAY_MS;
const FRESH_MS = 14 * DAY_MS;
const STALE_MS = 45 * DAY_MS;

export interface ForYouOptions {
  /** Marked "Not interested" on this phone; never shown. */
  hiddenIds?: ReadonlySet<string>;
  affinity?: Affinity;
}

type Placement = 'excluded' | 'local' | 'other_city';

export function buildForYouFeed(
  events: readonly EventCardData[],
  profile: LocalDiscoveryProfile | null,
  now: Date = new Date(),
  { hiddenIds, affinity }: ForYouOptions = {},
): ForYouFeed {
  const interests = profile?.interestIds ?? [];
  const goals = profile?.goalIds ?? [];
  const personalized = interests.length > 0 || goals.length > 0;

  const local: EventCardData[] = [];
  const otherCity: EventCardData[] = [];
  for (const event of events) {
    if (hiddenIds?.has(event.id)) continue;
    const placement = place(event, profile, now);
    if (placement === 'local') local.push(event);
    else if (placement === 'other_city') otherCity.push(event);
  }
  local.sort(bySoonest);

  if (!personalized) {
    // Cold start: date order, no reasons shown.
    return { personalized, topPicks: [], moreUpcoming: local, beyondCity: [] };
  }

  const scored = local
    .map((event) => score(event, interests, goals, now, affinity))
    .filter((item) => item.matched)
    .sort((a, b) => b.points - a.points || bySoonest(a.event, b.event));

  const topPicks: TopPick[] = [];
  const organizers = new Set<string>();
  const perTopic = new Map<string, number>();
  for (const item of scored) {
    if (topPicks.length === MAX_TOP_PICKS) break;
    const organizer = item.event.organizerName.trim().toLowerCase();
    if (organizers.has(organizer)) continue;
    // The topic it was picked for: the first of the person's interests it
    // matches, else its own first topic.
    const topic =
      interests.find((id) => item.event.topics.includes(id)) ??
      item.event.topics[0];
    if (topic && (perTopic.get(topic) ?? 0) >= MAX_PICKS_PER_TOPIC) continue;
    organizers.add(organizer);
    if (topic) perTopic.set(topic, (perTopic.get(topic) ?? 0) + 1);
    topPicks.push({
      event: item.event,
      // The most telling reasons first, so the limit cuts the least useful.
      reasons: [...item.reasons]
        .sort((a, b) => REASON_PRIORITY[a.kind] - REASON_PRIORITY[b.kind])
        .slice(0, MAX_REASONS),
    });
  }

  const picked = new Set(topPicks.map((pick) => pick.event.id));
  const moreUpcoming = local.filter((event) => !picked.has(event.id));

  const beyondCity = otherCity
    .filter((event) => score(event, interests, goals, now).matched)
    .map((event) => withDistance(event, profile))
    .sort(
      (a, b) =>
        Number(affinity?.isTooFar(a) ?? false) -
          Number(affinity?.isTooFar(b) ?? false) || byNearestThenSoonest(a, b),
    );

  return { personalized, topPicks, moreUpcoming, beyondCity };
}

/** Not cancelled, not ended, and not started yet. */
export function isUpcoming(event: EventCardData, now: Date): boolean {
  if (event.status === 'cancelled' || event.status === 'completed') {
    return false;
  }
  return Date.parse(event.startsAt) >= now.getTime();
}

/** Hard rules. Nothing excluded here is ever shown in For You. */
function place(
  event: EventCardData,
  profile: LocalDiscoveryProfile | null,
  now: Date,
): Placement {
  if (!isUpcoming(event, now)) return 'excluded';
  if (!profile) return 'local';

  const format = effectiveFormat(profile);
  if (format === 'in_person' && event.format === 'virtual') return 'excluded';
  if (format === 'online' && event.format === 'in_person') return 'excluded';

  // Online events are eligible wherever the user is.
  if (event.format === 'virtual') return 'local';
  if (profile.area?.kind !== 'city') return 'local';
  if (!event.city) return 'local';
  if (samePlace(event.city, profile.area.city.name)) return 'local';
  // A hybrid event elsewhere is still held in another city: it goes with the
  // other cities, unless this person only attends online anyway.
  if (event.format === 'hybrid' && format === 'online') return 'local';
  return 'other_city';
}

function score(
  event: EventCardData,
  interests: readonly TopicId[],
  goals: readonly GoalId[],
  now: Date,
  affinity?: Affinity,
): {
  event: EventCardData;
  points: number;
  matched: boolean;
  reasons: MatchReason[];
} {
  const reasons: MatchReason[] = [];
  let points = 0;

  const topicMatches = interests.filter((id) => event.topics.includes(id));
  if (topicMatches.length > 0) points += WEIGHTS.interest;
  for (const topicId of topicMatches) reasons.push({ kind: 'topic', topicId });

  const goalMatches = goals.filter((id) =>
    GOAL_OFFERS[id].some((offer) => event.offers.includes(offer)),
  );
  if (goalMatches.length > 0) points += WEIGHTS.goal;
  for (const goalId of goalMatches) reasons.push({ kind: 'goal', goalId });

  const matched = reasons.length > 0;

  const daysAway = (Date.parse(event.startsAt) - now.getTime()) / DAY_MS;
  if (daysAway <= 7) {
    points += WEIGHTS.timingThisWeek;
    if (matched) reasons.push({ kind: 'soon' });
  } else if (daysAway <= 30) {
    points += WEIGHTS.timingThisMonth;
  }

  if (event.verificationState === 'organizer_confirmed') {
    points += WEIGHTS.organizerConfirmed;
  } else if (event.verificationState === 'source_confirmed') {
    points += WEIGHTS.sourceConfirmed;
  }

  const deadline = event.registrationDeadline
    ? Date.parse(event.registrationDeadline) - now.getTime()
    : Number.NaN;
  if (matched && deadline >= 0 && deadline <= DEADLINE_SOON_MS) {
    points += WEIGHTS.deadlineSoon;
    reasons.unshift({ kind: 'deadline' });
  }

  const checked = event.lastCheckedAt
    ? now.getTime() - Date.parse(event.lastCheckedAt)
    : Number.NaN;
  if (checked <= FRESH_MS) points += WEIGHTS.freshCheck;
  else if (checked >= STALE_MS) points += WEIGHTS.staleCheck;

  if (affinity) {
    points += WEIGHTS.affinity * affinity.score(event);
    if (matched && affinity.isHabit(event)) reasons.push({ kind: 'habit' });
  }

  return { event, points, matched, reasons };
}

function withDistance(
  event: EventCardData,
  profile: LocalDiscoveryProfile | null,
): EventCardData {
  const center =
    profile?.area?.kind === 'city'
      ? CITY_CENTERS[profile.area.city.id]
      : undefined;
  if (!center || event.latitude == null || event.longitude == null) {
    return event;
  }
  return {
    ...event,
    distanceKm: distanceKm(center, {
      lat: event.latitude,
      lng: event.longitude,
    }),
  };
}

function bySoonest(a: EventCardData, b: EventCardData): number {
  return Date.parse(a.startsAt) - Date.parse(b.startsAt);
}

/** Located events first, nearest first; the rest by date. */
function byNearestThenSoonest(a: EventCardData, b: EventCardData): number {
  if (a.distanceKm != null && b.distanceKm != null) {
    return a.distanceKm - b.distanceKm || bySoonest(a, b);
  }
  if (a.distanceKm != null) return -1;
  if (b.distanceKm != null) return 1;
  return bySoonest(a, b);
}
