/**
 * The application's only interface to stored events. Callers receive `Event`
 * values and typed `EventRepositoryError`s; database rows, column names and
 * PostgREST error codes stay inside this file.
 *
 * The Supabase client is injected so the same repository runs with the app
 * session, a curator session, or a test session. Row Level Security on that
 * session decides what each caller may read and write.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Event,
  EventFilters,
  EventFormat,
  EventInput,
  EventListQuery,
  EventPage,
  EventSort,
  EventTaxonomy,
  PriceType,
  PublicationStatus,
  SourceType,
  VerificationState,
} from '../types/event.type.ts';

export type EventRepositoryErrorKind =
  | 'not_found'
  | 'invalid_input'
  | 'unauthorized'
  | 'conflict'
  | 'unavailable';

export class EventRepositoryError extends Error {
  readonly kind: EventRepositoryErrorKind;
  readonly code: string | null;

  constructor(
    kind: EventRepositoryErrorKind,
    message: string,
    code: string | null = null,
  ) {
    super(message);
    this.name = 'EventRepositoryError';
    this.kind = kind;
    this.code = code;
  }
}

export function isEventRepositoryError(
  error: unknown,
): error is EventRepositoryError {
  return error instanceof EventRepositoryError;
}

export interface EventRepository {
  /** Any event the session may read. Throws `not_found` otherwise. */
  getById(id: string): Promise<Event>;
  /** Curation listing: every event the session may read. */
  list(query?: EventListQuery): Promise<EventPage>;
  /** Consumer listing: published and confirmed only, whoever is signed in. */
  listPublished(query?: EventListQuery): Promise<EventPage>;
  getPublishedById(id: string): Promise<Event>;
  create(input: EventInput): Promise<Event>;
  /** Fails with `conflict` when the event changed after `expectedUpdatedAt`. */
  update(
    id: string,
    expectedUpdatedAt: string,
    input: EventInput,
  ): Promise<Event>;
  changePublication(
    id: string,
    from: PublicationStatus,
    to: PublicationStatus,
  ): Promise<Event>;
  /** Records a check now; the database sets who checked and when. */
  recordVerification(id: string, state: VerificationState): Promise<Event>;
  listTaxonomy(): Promise<EventTaxonomy>;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_SELECT =
  '*, event_topics(topic_id), event_offers(offer_id), event_languages(language_code)';

const CONFIRMED: VerificationState[] = [
  'source_confirmed',
  'organizer_confirmed',
];

interface EventRow {
  id: string;
  title: string;
  description: string;
  category: string;
  format: EventFormat;
  start_at: string;
  end_at: string | null;
  timezone: string | null;
  registration_deadline: string | null;
  city: string | null;
  country_code: string | null;
  venue_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  virtual_access_type: string | null;
  organizer_id: string | null;
  organizer_name: string;
  price_type: PriceType | null;
  currency: string | null;
  price_min: number | string | null;
  price_max: number | string | null;
  source_url: string;
  source_type: SourceType;
  registration_url: string | null;
  source_submission_id: string | null;
  verification_state: VerificationState;
  last_checked_at: string | null;
  checked_by: string | null;
  publication_status: PublicationStatus;
  created_at: string | null;
  updated_at: string;
  event_topics?: { topic_id: string }[] | null;
  event_offers?: { offer_id: string }[] | null;
  event_languages?: { language_code: string }[] | null;
}

interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

const UNAUTHORIZED_CODES = new Set(['42501', 'PGRST301', 'PGRST302']);
const NOT_FOUND_CODES = new Set(['P0002', 'PGRST116']);
const CONFLICT_CODES = new Set(['40001', '23505']);

export function classifyError(error: PostgrestLikeError): EventRepositoryError {
  const code = error.code ?? null;
  const message = error.message || 'Event storage request failed.';
  if (code && UNAUTHORIZED_CODES.has(code)) {
    return new EventRepositoryError('unauthorized', message, code);
  }
  if (code && NOT_FOUND_CODES.has(code)) {
    return new EventRepositoryError('not_found', message, code);
  }
  if (code && CONFLICT_CODES.has(code)) {
    return new EventRepositoryError('conflict', message, code);
  }
  if (code && (code.startsWith('22') || code.startsWith('23'))) {
    return new EventRepositoryError('invalid_input', message, code);
  }
  return new EventRepositoryError('unavailable', message, code);
}

function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    format: row.format,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone,
    registrationDeadline: row.registration_deadline,
    city: row.city,
    countryCode: row.country_code?.trim() ?? null,
    venueName: row.venue_name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    virtualAccessType: row.virtual_access_type,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name,
    topics: (row.event_topics ?? []).map((item) => item.topic_id).sort(),
    offers: (row.event_offers ?? []).map((item) => item.offer_id).sort(),
    languages: (row.event_languages ?? [])
      .map((item) => item.language_code)
      .sort(),
    priceType: row.price_type ?? 'unknown',
    currency: row.currency?.trim() ?? null,
    priceMin: numberOrNull(row.price_min),
    priceMax: numberOrNull(row.price_max),
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    registrationUrl: row.registration_url,
    sourceSubmissionId: row.source_submission_id,
    verificationState: row.verification_state,
    lastCheckedAt: row.last_checked_at,
    checkedBy: row.checked_by,
    publicationStatus: row.publication_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToPayload(input: EventInput): Record<string, unknown> {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    format: input.format,
    start_at: input.startAt,
    end_at: input.endAt,
    timezone: input.timezone,
    registration_deadline: input.registrationDeadline,
    city: input.city,
    country_code: input.countryCode,
    venue_name: input.venueName,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    virtual_access_type: input.virtualAccessType,
    organizer_name: input.organizerName,
    source_url: input.sourceUrl,
    source_type: input.sourceType,
    registration_url: input.registrationUrl,
    price_type: input.priceType,
    currency: input.currency,
    price_min: input.priceMin,
    price_max: input.priceMax,
  };
}

const SORT_COLUMNS: Record<
  EventSort,
  { column: 'start_at' | 'updated_at'; ascending: boolean }
> = {
  start_asc: { column: 'start_at', ascending: true },
  start_desc: { column: 'start_at', ascending: false },
  updated_desc: { column: 'updated_at', ascending: false },
};

/** Removes characters that PostgREST filter syntax or LIKE treat specially. */
function searchTerm(value: string): string {
  return value
    .replace(/[%_*,()"\\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function assertId(id: string): void {
  if (!UUID.test(id)) {
    throw new EventRepositoryError('invalid_input', 'Event id is not valid.');
  }
}

function assertInstant(value: string | undefined, label: string): void {
  if (value !== undefined && !Number.isFinite(Date.parse(value))) {
    throw new EventRepositoryError(
      'invalid_input',
      `${label} is not a valid date.`,
    );
  }
}

function unavailable(error: unknown): EventRepositoryError {
  if (isEventRepositoryError(error)) return error;
  const message =
    error instanceof Error ? error.message : 'Event storage is unreachable.';
  return new EventRepositoryError('unavailable', message);
}

export function createEventRepository(client: SupabaseClient): EventRepository {
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw unavailable(error);
    }
  }

  async function findById(
    id: string,
    publishedOnly: boolean,
  ): Promise<Event | null> {
    let query = client.from('events').select(EVENT_SELECT).eq('id', id);
    if (publishedOnly) {
      query = query
        .eq('publication_status', 'published')
        .in('verification_state', CONFIRMED);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw classifyError(error);
    return data ? rowToEvent(data as EventRow) : null;
  }

  async function getById(id: string, publishedOnly: boolean): Promise<Event> {
    assertId(id);
    return run(async () => {
      const event = await findById(id, publishedOnly);
      if (!event) {
        throw new EventRepositoryError('not_found', 'Event not found.');
      }
      return event;
    });
  }

  async function listEvents(
    query: EventListQuery,
    publishedOnly: boolean,
  ): Promise<EventPage> {
    const sort = query.sort ?? 'start_asc';
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const filters: EventFilters = query.filters ?? {};
    const cursor = query.cursor ?? null;

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new EventRepositoryError(
        'invalid_input',
        `Page size must be between 1 and ${MAX_PAGE_SIZE}.`,
      );
    }
    if (cursor) {
      if (cursor.sort !== sort) {
        throw new EventRepositoryError(
          'invalid_input',
          'The page cursor belongs to a different sort order.',
        );
      }
      assertId(cursor.id);
      assertInstant(cursor.value, 'Cursor');
    }
    assertInstant(filters.startsFrom, 'Start date');
    assertInstant(filters.startsBefore, 'End date');
    assertInstant(filters.lastCheckedBefore, 'Check date');

    const { column, ascending } = SORT_COLUMNS[sort];
    let request = client.from('events').select(EVENT_SELECT);

    const statuses = publishedOnly
      ? (['published'] as PublicationStatus[])
      : filters.publicationStatuses;
    if (statuses && statuses.length > 0) {
      request = request.in('publication_status', statuses);
    }
    const states = publishedOnly
      ? CONFIRMED.filter(
          (state) =>
            !filters.verificationStates?.length ||
            filters.verificationStates.includes(state),
        )
      : filters.verificationStates;
    if (publishedOnly && states?.length === 0) {
      return { items: [], nextCursor: null };
    }
    if (states && states.length > 0) {
      request = request.in('verification_state', states);
    }
    if (filters.formats && filters.formats.length > 0) {
      request = request.in('format', filters.formats);
    }
    if (filters.category?.trim()) {
      request = request.eq('category', filters.category.trim());
    }
    if (filters.city?.trim()) {
      request = request.ilike('city', likeExact(filters.city.trim()));
    }
    if (filters.countryCode?.trim()) {
      request = request.eq(
        'country_code',
        filters.countryCode.trim().toUpperCase(),
      );
    }
    if (filters.startsFrom) {
      request = request.gte('start_at', filters.startsFrom);
    }
    if (filters.startsBefore) {
      request = request.lt('start_at', filters.startsBefore);
    }

    const orGroups: string[] = [];
    if (filters.lastCheckedBefore) {
      orGroups.push(
        `last_checked_at.is.null,last_checked_at.lt."${filters.lastCheckedBefore}"`,
      );
    }
    const term = filters.search ? searchTerm(filters.search) : '';
    if (term) {
      orGroups.push(
        ['title', 'organizer_name', 'venue_name', 'city']
          .map((field) => `${field}.ilike."%${term}%"`)
          .join(','),
      );
    }
    if (cursor) {
      const op = ascending ? 'gt' : 'lt';
      orGroups.push(
        `${column}.${op}."${cursor.value}",and(${column}.eq."${cursor.value}",id.${op}.${cursor.id})`,
      );
    }
    if (orGroups.length === 1) {
      request = request.or(orGroups[0]);
    } else if (orGroups.length > 1) {
      request = request.or(
        `and(${orGroups.map((group) => `or(${group})`).join(',')})`,
      );
    }

    request = request
      .order(column, { ascending })
      .order('id', { ascending })
      .limit(limit + 1);

    return run(async () => {
      const { data, error } = await request;
      if (error) throw classifyError(error);
      const rows = (data ?? []) as EventRow[];
      const pageRows = rows.slice(0, limit);
      const last = pageRows[pageRows.length - 1];
      return {
        items: pageRows.map(rowToEvent),
        nextCursor:
          rows.length > limit && last
            ? { sort, value: last[column], id: last.id }
            : null,
      };
    });
  }

  async function save(
    id: string | null,
    expectedUpdatedAt: string | null,
    input: EventInput,
  ): Promise<Event> {
    return run(async () => {
      const { data, error } = await client.rpc('save_event', {
        p_event_id: id,
        p_expected_updated_at: expectedUpdatedAt,
        p_event: inputToPayload(input),
        p_topics: input.topics,
        p_offers: input.offers,
        p_languages: input.languages,
      });
      if (error) throw classifyError(error);
      if (typeof data !== 'string') {
        throw new EventRepositoryError(
          'unavailable',
          'Save did not return an event id.',
        );
      }
      const saved = await findById(data, false);
      if (!saved) {
        throw new EventRepositoryError(
          'unavailable',
          'The saved event could not be read back.',
        );
      }
      return saved;
    });
  }

  /** A write matched no row: work out whether it was missing, changed, or
   *  not permitted for this session. */
  async function explainNoRowsWritten(
    id: string,
    expectedStatus: PublicationStatus | null,
  ): Promise<never> {
    const current = await findById(id, false);
    if (!current) {
      throw new EventRepositoryError('not_found', 'Event not found.');
    }
    if (expectedStatus && current.publicationStatus !== expectedStatus) {
      throw new EventRepositoryError(
        'conflict',
        `The event is now ${current.publicationStatus}; reload before changing it.`,
      );
    }
    throw new EventRepositoryError(
      'unauthorized',
      'This account cannot change events.',
    );
  }

  return {
    getById: (id) => getById(id, false),
    getPublishedById: (id) => getById(id, true),
    list: (query = {}) => listEvents(query, false),
    listPublished: (query = {}) => listEvents(query, true),

    create: (input) => save(null, null, input),

    update: async (id, expectedUpdatedAt, input) => {
      assertId(id);
      assertInstant(expectedUpdatedAt, 'Last update');
      return save(id, expectedUpdatedAt, input);
    },

    changePublication: async (id, from, to) => {
      assertId(id);
      return run(async () => {
        const { data, error } = await client
          .from('events')
          .update({ publication_status: to })
          .eq('id', id)
          .eq('publication_status', from)
          .select(EVENT_SELECT);
        if (error) throw classifyError(error);
        const rows = (data ?? []) as EventRow[];
        if (rows.length === 1) return rowToEvent(rows[0]);
        return explainNoRowsWritten(id, from);
      });
    },

    recordVerification: async (id, state) => {
      assertId(id);
      return run(async () => {
        const { data, error } = await client
          .from('events')
          .update({
            verification_state: state,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select(EVENT_SELECT);
        if (error) throw classifyError(error);
        const rows = (data ?? []) as EventRow[];
        if (rows.length === 1) return rowToEvent(rows[0]);
        return explainNoRowsWritten(id, null);
      });
    },

    listTaxonomy: () =>
      run(async () => {
        const [topics, offers] = await Promise.all([
          client.from('topics').select('id').order('id', { ascending: true }),
          client.from('offers').select('id').order('id', { ascending: true }),
        ]);
        if (topics.error) throw classifyError(topics.error);
        if (offers.error) throw classifyError(offers.error);
        return {
          topics: (topics.data ?? []).map((row) => row.id as string),
          offers: (offers.data ?? []).map((row) => row.id as string),
        };
      }),
  };
}
