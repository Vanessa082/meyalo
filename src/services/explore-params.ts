import {
  type City,
  OTHER_CITIES,
  QUICK_PICK_CITIES,
} from '../config/discovery/cities.ts';
import { OFFER_IDS, type OfferId } from '../config/discovery/offers.ts';
import { TOPIC_IDS, type TopicId } from '../config/discovery/topics.ts';
import type {
  EventCardData,
  EventFormat,
  EventSearchInput,
} from '../types/event.type.ts';
import { samePlace } from './geo.ts';
import { DAY_MS, wallTimeToInstant, zonedDay } from './zoned-time.ts';

/**
 * Explore's search and filters as page-address parameters
 * (docs/product-decisions.md, Feature 7 spec). Parsing validates everything:
 * an address can come from anywhere, so unknown values are dropped.
 */

export type DatePreset = 'today' | 'weekend' | 'week';
export type ExploreSort = 'soonest' | 'recent';
export type ExploreLanguage = 'en' | 'fr';
export type PriceFilter = 'free' | 'paid';

export interface ExploreState {
  q: string;
  when: DatePreset | null;
  /** City ids from config/discovery/cities.ts. */
  cities: string[];
  formats: EventFormat[];
  /** Free: free or free with registration. Paid: paid or varying. */
  prices: PriceFilter[];
  topics: TopicId[];
  offers: OfferId[];
  languages: ExploreLanguage[];
  open: boolean;
  sort: ExploreSort;
}

export const EMPTY_EXPLORE: ExploreState = {
  q: '',
  when: null,
  cities: [],
  formats: [],
  prices: [],
  topics: [],
  offers: [],
  languages: [],
  open: false,
  sort: 'soonest',
};

export const DATE_PRESETS: readonly DatePreset[] = ['today', 'weekend', 'week'];
export const FORMATS: readonly EventFormat[] = [
  'in_person',
  'virtual',
  'hybrid',
];
export const LANGUAGES: readonly ExploreLanguage[] = ['en', 'fr'];
export const PRICES: readonly PriceFilter[] = ['free', 'paid'];
const SORTS: readonly ExploreSort[] = ['soonest', 'recent'];
export const MAX_QUERY_LENGTH = 100;

const CITIES: readonly City[] = [...QUICK_PICK_CITIES, ...OTHER_CITIES];
const CITY_IDS = CITIES.map((city) => city.id);

type RawParams = Record<string, string | string[] | undefined>;

/** Values of a list parameter, kept only if allowed, in `allowed` order. */
function list<T extends string>(raw: RawParams[string], allowed: readonly T[]) {
  const given = new Set(
    (Array.isArray(raw) ? raw : [raw ?? ''])
      .flatMap((value) => value.split(','))
      .map((value) => value.trim()),
  );
  return allowed.filter((value) => given.has(value));
}

function single<T extends string>(
  raw: RawParams[string],
  allowed: readonly T[],
): T | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return allowed.includes(value as T) ? (value as T) : null;
}

export function parseExploreParams(params: RawParams): ExploreState {
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  return {
    q: (q ?? '').trim().slice(0, MAX_QUERY_LENGTH),
    when: single(params.when, DATE_PRESETS),
    cities: list(params.city, CITY_IDS),
    formats: list(params.format, FORMATS),
    prices: list(params.price, PRICES),
    topics: list(params.topic, TOPIC_IDS),
    offers: list(params.offer, OFFER_IDS),
    languages: list(params.lang, LANGUAGES),
    open: single(params.open, ['1']) !== null,
    sort: single(params.sort, SORTS) ?? 'soonest',
  };
}

/** Parameters for the address; defaults are left out. */
export function toExploreParams(state: ExploreState): Record<string, string> {
  const params: Record<string, string> = {};
  if (state.q) params.q = state.q;
  if (state.when) params.when = state.when;
  if (state.cities.length) params.city = state.cities.join(',');
  if (state.formats.length) params.format = state.formats.join(',');
  if (state.prices.length) params.price = state.prices.join(',');
  if (state.topics.length) params.topic = state.topics.join(',');
  if (state.offers.length) params.offer = state.offers.join(',');
  if (state.languages.length) params.lang = state.languages.join(',');
  if (state.open) params.open = '1';
  if (state.sort !== 'soonest') params.sort = state.sort;
  return params;
}

/** Filter groups in use, for the badge. The query and sort are not filters. */
export function activeFilterCount(state: ExploreState): number {
  return [
    state.when !== null,
    state.cities.length > 0,
    state.formats.length > 0,
    state.prices.length > 0,
    state.topics.length > 0,
    state.offers.length > 0,
    state.languages.length > 0,
    state.open,
  ].filter(Boolean).length;
}

/** Start and end (exclusive) of a preset, as instants, in `timeZone`. */
export function dateWindow(
  preset: DatePreset,
  now: Date,
  timeZone: string,
): { from: string; before: string } {
  const today = zonedDay(now.toISOString(), timeZone);
  if (!today) throw new Error(`Unknown timezone ${timeZone}`);
  // weekday: 0 Sunday … 6 Saturday. The week ends after Sunday.
  const daysToMonday = today.weekday === 0 ? 1 : 8 - today.weekday;
  const nextMonday = today.date + daysToMonday * DAY_MS;

  const start =
    preset === 'weekend'
      ? Math.max(today.date, nextMonday - 2 * DAY_MS)
      : today.date;
  const end = preset === 'today' ? today.date + DAY_MS : nextMonday;
  return { from: midnight(start, timeZone), before: midnight(end, timeZone) };
}

/** Local midnight of a calendar day (given as its UTC midnight) as an instant. */
function midnight(day: number, timeZone: string): string {
  const instant = wallTimeToInstant(
    `${new Date(day).toISOString().slice(0, 10)} 00:00`,
    timeZone,
  );
  if (!instant) throw new Error(`Unknown timezone ${timeZone}`);
  return instant;
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Topics whose name, in any language, contains the query. */
export function topicsMatching(
  query: string,
  labels: (id: TopicId) => readonly string[],
): TopicId[] {
  const q = fold(query);
  if (q.length < 3) return [];
  return TOPIC_IDS.filter((id) =>
    labels(id).some((label) => fold(label).includes(q)),
  );
}

export function toSearchInput(
  state: ExploreState,
  now: Date,
  timeZone: string,
  queryTopics: readonly string[],
): EventSearchInput {
  const input: EventSearchInput = { registrationOpen: state.open };
  if (state.q) input.query = state.q;
  if (state.q && queryTopics.length) input.queryTopics = [...queryTopics];
  if (state.cities.length) {
    input.cities = state.cities.map(
      (id) => CITIES.find((city) => city.id === id)?.name ?? id,
    );
  }
  if (state.formats.length) input.formats = [...state.formats];
  if (state.prices.length) input.prices = [...state.prices];
  if (state.topics.length) input.topics = [...state.topics];
  if (state.offers.length) input.offers = [...state.offers];
  if (state.languages.length) input.languages = [...state.languages];
  if (state.when) {
    const window = dateWindow(state.when, now, timeZone);
    input.startsFrom = window.from;
    input.startsBefore = window.before;
  }
  return input;
}

/**
 * Explore parameters for "More like this" on an ended event: any of its
 * topics (they have no order of importance) and, when it happened in a
 * known city, that city.
 */
export function moreLikeThis(
  event: Pick<EventCardData, 'topics' | 'format' | 'city'>,
): Record<string, string> {
  const topics = event.topics.filter((id): id is TopicId =>
    (TOPIC_IDS as readonly string[]).includes(id),
  );
  const city =
    event.format !== 'virtual' && event.city
      ? CITIES.find((known) => samePlace(known.name, event.city as string))
      : undefined;
  return toExploreParams({
    ...EMPTY_EXPLORE,
    topics: TOPIC_IDS.filter((id) => topics.includes(id)),
    cities: city ? [city.id] : [],
  });
}
