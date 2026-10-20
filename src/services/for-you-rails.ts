import { TOPIC_IDS, type TopicId } from '../config/discovery/topics.ts';
import type { EventCardData } from '../types/event.type.ts';
import type { MatchReason, TopPick } from './ranking.service.ts';
import { DAY_MS } from './zoned-time.ts';

/**
 * How the For You feed is laid out (docs/product-decisions.md, Feature 5 and
 * "What intelligent means"): a carousel to lead, then rails, then the rest.
 * Every event appears once. Pure, so the arrangement is tested here.
 */

export type ForYouRail =
  | { kind: 'closing_soon'; events: EventCardData[] }
  | { kind: 'topic'; topicId: TopicId; events: EventCardData[] };

export interface ForYouLayout {
  carousel: { event: EventCardData; reasons: MatchReason[] }[];
  rails: ForYouRail[];
  rest: EventCardData[];
}

const CAROUSEL_MAX = 5;
const RAIL_MAX = 8;
const RAIL_MIN = 2;
const TOPIC_RAILS_MAX = 3;
const CLOSING_SOON_MS = 7 * DAY_MS;

export function buildForYouLayout(
  feed: { topPicks: TopPick[]; moreUpcoming: EventCardData[] },
  interests: readonly TopicId[],
  now: Date,
): ForYouLayout {
  let remaining = [...feed.moreUpcoming];
  const take = (chosen: EventCardData[]) => {
    const ids = new Set(chosen.map((event) => event.id));
    remaining = remaining.filter((event) => !ids.has(event.id));
    return chosen;
  };

  // Personal picks lead. Without them, what is on in the next 7 days.
  const carousel =
    feed.topPicks.length > 0
      ? feed.topPicks.map(({ event, reasons }) => ({ event, reasons }))
      : take(
          remaining
            .filter(
              (event) =>
                Date.parse(event.startsAt) - now.getTime() <= 7 * DAY_MS,
            )
            .slice(0, CAROUSEL_MAX),
        ).map((event) => ({ event, reasons: [] as MatchReason[] }));

  const rails: ForYouRail[] = [];

  // Deadlines first: missing one is the costliest miss.
  const closing = remaining
    .filter((event) => {
      if (!event.registrationDeadline) return false;
      const left = Date.parse(event.registrationDeadline) - now.getTime();
      return left >= 0 && left <= CLOSING_SOON_MS;
    })
    .sort(
      (a, b) =>
        Date.parse(a.registrationDeadline ?? '') -
        Date.parse(b.registrationDeadline ?? ''),
    )
    .slice(0, RAIL_MAX);
  if (closing.length > 0) {
    rails.push({ kind: 'closing_soon', events: take(closing) });
  }

  // The person's own topics, in their order; without any, the most common.
  const topics = interests.length > 0 ? interests : commonTopics(remaining);
  for (const topicId of topics) {
    if (
      rails.filter((rail) => rail.kind === 'topic').length === TOPIC_RAILS_MAX
    ) {
      break;
    }
    const matching = remaining
      .filter((event) => event.topics.includes(topicId))
      .slice(0, RAIL_MAX);
    if (matching.length >= RAIL_MIN) {
      rails.push({ kind: 'topic', topicId, events: take(matching) });
    }
  }

  return { carousel, rails, rest: remaining };
}

/** Topics by how many events carry them, most first; ties in taxonomy order. */
function commonTopics(events: readonly EventCardData[]): TopicId[] {
  const counts = new Map<TopicId, number>();
  for (const event of events) {
    for (const topic of event.topics) {
      if ((TOPIC_IDS as readonly string[]).includes(topic)) {
        const id = topic as TopicId;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1] || TOPIC_IDS.indexOf(a[0]) - TOPIC_IDS.indexOf(b[0]),
    )
    .map(([id]) => id);
}
