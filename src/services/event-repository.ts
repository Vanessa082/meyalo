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
  CheckResult,
  CoverImage,
  Event,
  EventCheck,
  EventCheckInput,
  EventCursor,
  EventFilters,
  EventFormat,
  EventInput,
  EventListQuery,
  EventPage,
  EventReport,
  EventReportInput,
  EventSearchInput,
  EventSort,
  EventTaxonomy,
  PriceType,
  PublicationStatus,
  SourceType,
  VerificationState,
} from '../types/event.type.ts';
import { REPORT_NOTE_MAX, REPORT_REASONS } from '../types/event.type.ts';
import { consentColumns, consentProblem } from './consent.ts';
import {
  COVER_IMAGE_WIDTHS,
  type CoverImageRights,
  coverImageFiles,
} from './cover-image.ts';
import { checkInputProblem } from './event-domain.ts';

export type EventRepositoryErrorKind =
  | 'not_found'
  | 'invalid_input'
  | 'unauthorized'
  | 'conflict'
  | 'rate_limited'
  | 'unavailable';

export interface EventTranslation {
  title: string;
  description: string;
}

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
  /** Explore search (search_public_events, 010). The first page carries the
   *  total number of results. */
  searchPublished(
    input: EventSearchInput,
    query?: Pick<EventListQuery, 'sort' | 'limit' | 'cursor'>,
  ): Promise<EventPage>;
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
  /** Records a curator's check and applies it (record_check, 007). */
  recordCheck(input: EventCheckInput): Promise<CheckResult>;
  /** Curators only: the evidence trail of one event, newest first. */
  listChecks(eventId: string): Promise<EventCheck[]>;
  /** Curators only: reports about one event, newest first. */
  listReports(eventId: string): Promise<EventReport[]>;
  /** Files a report for curators. Anyone may report; nobody can read it back
   *  except curators, so success returns nothing. */
  report(input: EventReportInput): Promise<void>;
  /** Machine translation of a published event's title and description, done
   *  and cached on the server. `unavailable` with code `not_configured` when
   *  no translation provider is set up. */
  translate(eventId: string, target: 'en' | 'fr'): Promise<EventTranslation>;
  /** Curators only. Uploads both sizes under `uploadId`, records the image
   *  with its rights and alt text, then deletes the previous files. */
  setCoverImage(
    eventId: string,
    uploadId: string,
    images: { small: Blob; large: Blob },
    input: { rights: CoverImageRights; alt: string; credit: string | null },
  ): Promise<Event>;
  /** Curators only. The date card comes back. */
  removeCoverImage(eventId: string): Promise<Event>;
  listTaxonomy(): Promise<EventTaxonomy>;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_SELECT =
  '*, event_topics(topic_id), event_offers(offer_id), event_languages(language_code)';

/** Consumer reads use events_public (006), which leaves out checked_by and
 *  source_submission_id; anon cannot read those columns of events (008).
 *  Curator reads use the table. */
function eventSource(publishedOnly: boolean): 'events' | 'events_public' {
  return publishedOnly ? 'events_public' : 'events';
}

/** What keyset paging needs from a PostgREST query, whether it reads a
 *  table or a function. */
interface PageableRequest
  extends PromiseLike<{
    data: unknown;
    error: { message: string; code?: string } | null;
    count: number | null;
  }> {
  or(filters: string): PageableRequest;
  order(column: string, options: { ascending: boolean }): PageableRequest;
  limit(count: number): PageableRequest;
}

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
  /** Absent when read through events_public. */
  source_submission_id?: string | null;
  cover_image_path?: string | null;
  cover_image_alt?: string | null;
  cover_image_credit?: string | null;
  /** Curator reads only. */
  cover_image_rights?: CoverImage['rights'];
  verification_state: VerificationState;
  last_checked_at: string | null;
  /** Absent when read through events_public. */
  checked_by?: string | null;
  publication_status: PublicationStatus;
  created_at: string;
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
  // Raised by limit_report_rate (006_hardening.sql).
  if (code === 'PT429') {
    return new EventRepositoryError('rate_limited', message, code);
  }
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

/** Storage refusals carry an HTTP status, not a Postgres code. */
function storageError(error: {
  message?: string;
  statusCode?: string | number;
}): EventRepositoryError {
  const status = Number(error.statusCode);
  const message = error.message || 'Image upload failed.';
  if (status === 401 || status === 403 || /row-level security/i.test(message)) {
    return new EventRepositoryError('unauthorized', message, String(status));
  }
  if (status === 413 || status === 415 || status === 400) {
    return new EventRepositoryError('invalid_input', message, String(status));
  }
  return new EventRepositoryError('unavailable', message, String(status));
}

function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function rowToEvent(
  row: EventRow,
  imageUrl: (file: string) => string = (file) => file,
): Event {
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
    sourceSubmissionId: row.source_submission_id ?? null,
    verificationState: row.verification_state,
    lastCheckedAt: row.last_checked_at,
    checkedBy: row.checked_by ?? null,
    // The database requires alt text with every image (011); a row without
    // it is treated as having no image rather than shown inaccessibly.
    coverImage:
      row.cover_image_path && row.cover_image_alt
        ? {
            path: row.cover_image_path,
            smallUrl: imageUrl(
              `${row.cover_image_path}-${COVER_IMAGE_WIDTHS.small}.webp`,
            ),
            largeUrl: imageUrl(
              `${row.cover_image_path}-${COVER_IMAGE_WIDTHS.large}.webp`,
            ),
            alt: row.cover_image_alt,
            credit: row.cover_image_credit ?? null,
            rights: row.cover_image_rights ?? null,
          }
        : null,
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
  { column: 'start_at' | 'updated_at' | 'created_at'; ascending: boolean }
> = {
  start_asc: { column: 'start_at', ascending: true },
  start_desc: { column: 'start_at', ascending: false },
  updated_desc: { column: 'updated_at', ascending: false },
  created_desc: { column: 'created_at', ascending: false },
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

/** Public, cacheable event images (011_event_images.sql). */
export const EVENT_IMAGES_BUCKET = 'event-images';

export function createEventRepository(client: SupabaseClient): EventRepository {
  /** Every read maps rows here, so image URLs come from one place. */
  const publicImageUrl = (file: string) =>
    client.storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(file).data.publicUrl;
  const toEvent = (row: EventRow) => rowToEvent(row, publicImageUrl);

  async function currentImagePath(eventId: string): Promise<string | null> {
    const { data, error } = await run(async () =>
      client
        .from('events')
        .select('cover_image_path')
        .eq('id', eventId)
        .maybeSingle(),
    );
    if (error) throw classifyError(error);
    return (
      (data as { cover_image_path: string | null } | null)?.cover_image_path ??
      null
    );
  }

  /** Both sizes of one upload. A failed delete only leaves an unused file
   *  behind, never a broken event, so it does not fail the request. */
  async function removeImageFiles(path: string): Promise<void> {
    const files = [
      `${path}-${COVER_IMAGE_WIDTHS.small}.webp`,
      `${path}-${COVER_IMAGE_WIDTHS.large}.webp`,
    ];
    await client.storage
      .from(EVENT_IMAGES_BUCKET)
      .remove(files)
      .catch(() => undefined);
  }

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
    let query = client
      .from(eventSource(publishedOnly))
      .select(EVENT_SELECT)
      .eq('id', id);
    if (publishedOnly) {
      query = query
        .eq('publication_status', 'published')
        .in('verification_state', CONFIRMED);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw classifyError(error);
    return data ? toEvent(data as EventRow) : null;
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

    assertPaging(sort, limit, cursor);
    assertInstant(filters.startsFrom, 'Start date');
    assertInstant(filters.startsBefore, 'End date');
    assertInstant(filters.lastCheckedBefore, 'Check date');

    let request = client.from(eventSource(publishedOnly)).select(EVENT_SELECT);

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
    if (filters.notPinned) {
      // The events_coordinates constraint keeps latitude and longitude
      // null together, so one column is enough.
      request = request.is('latitude', null);
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
    return fetchPage(request, sort, limit, cursor, orGroups);
  }

  /** Validates paging input shared by every listing. */
  function assertPaging(
    sort: EventSort,
    limit: number,
    cursor: EventCursor | null,
  ) {
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
  }

  /** Keyset paging: the cursor, a stable order, and one extra row to know
   *  whether another page exists. `orGroups` are other OR filters to AND in. */
  async function fetchPage(
    request: PageableRequest,
    sort: EventSort,
    limit: number,
    cursor: EventCursor | null,
    orGroups: string[] = [],
  ): Promise<EventPage> {
    const { column, ascending } = SORT_COLUMNS[sort];
    const groups = [...orGroups];
    if (cursor) {
      const op = ascending ? 'gt' : 'lt';
      groups.push(
        `${column}.${op}."${cursor.value}",and(${column}.eq."${cursor.value}",id.${op}.${cursor.id})`,
      );
    }
    let paged = request;
    if (groups.length === 1) {
      paged = paged.or(groups[0]);
    } else if (groups.length > 1) {
      paged = paged.or(
        `and(${groups.map((group) => `or(${group})`).join(',')})`,
      );
    }
    paged = paged
      .order(column, { ascending })
      .order('id', { ascending })
      .limit(limit + 1);

    return run(async () => {
      const { data, error, count } = await paged;
      if (error) throw classifyError(error);
      const rows = (data ?? []) as EventRow[];
      const pageRows = rows.slice(0, limit);
      const last = pageRows[pageRows.length - 1];
      const page: EventPage = {
        items: pageRows.map(toEvent),
        nextCursor:
          rows.length > limit && last
            ? { sort, value: last[column], id: last.id }
            : null,
      };
      if (typeof count === 'number') page.total = count;
      return page;
    });
  }

  async function searchPublished(
    input: EventSearchInput,
    query: Pick<EventListQuery, 'sort' | 'limit' | 'cursor'> = {},
  ): Promise<EventPage> {
    const sort = query.sort ?? 'start_asc';
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = query.cursor ?? null;
    assertPaging(sort, limit, cursor);
    assertInstant(input.startsFrom, 'Start date');
    assertInstant(input.startsBefore, 'End date');

    const request = client
      .rpc(
        'search_public_events',
        {
          query: input.query ?? null,
          query_topics: input.queryTopics ?? null,
          cities: input.cities ?? null,
          formats: input.formats ?? null,
          prices: input.prices ?? null,
          topics: input.topics ?? null,
          offers: input.offers ?? null,
          languages: input.languages ?? null,
          registration_open: input.registrationOpen,
          starts_from: input.startsFrom ?? null,
          starts_before: input.startsBefore ?? null,
        },
        // A real total, counted once on the first page.
        cursor ? undefined : { count: 'exact' },
      )
      // `*` also keeps the sort column selected, which ordering a function's
      // result requires.
      .select(EVENT_SELECT);
    return fetchPage(request, sort, limit, cursor);
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
    searchPublished,

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
        if (rows.length === 1) return toEvent(rows[0]);
        return explainNoRowsWritten(id, from);
      });
    },

    recordCheck: async (input) => {
      assertId(input.eventId);
      const problem = checkInputProblem(input);
      if (problem) throw new EventRepositoryError('invalid_input', problem);
      return run(async () => {
        const { data, error } = await client.rpc('record_check', {
          p_event_id: input.eventId,
          p_state: input.state,
          p_method: input.method,
          p_evidence_url: input.evidenceUrl.trim(),
          p_red_flags: input.redFlags,
          p_charges_fee: input.chargesFee,
          p_notes: input.notes?.trim() || null,
        });
        if (error) throw classifyError(error);
        if (
          data !== 'confirmed' &&
          data !== 'needs_second_review' &&
          data !== 'rejected'
        ) {
          throw new EventRepositoryError(
            'unavailable',
            'Unexpected answer from record_check.',
          );
        }
        return data;
      });
    },

    listChecks: async (eventId) => {
      assertId(eventId);
      return run(async () => {
        const { data, error } = await client
          .from('event_checks')
          .select(
            'id, event_id, checked_by, method, outcome, state, evidence_url, red_flags, charges_fee, notes, created_at',
          )
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (error) throw classifyError(error);
        return (data ?? []).map((row) => ({
          id: row.id,
          eventId: row.event_id,
          checkedBy: row.checked_by,
          method: row.method,
          outcome: row.outcome,
          state: row.state,
          evidenceUrl: row.evidence_url,
          redFlags: row.red_flags ?? [],
          chargesFee: row.charges_fee,
          notes: row.notes,
          createdAt: row.created_at,
        }));
      });
    },

    listReports: async (eventId) => {
      assertId(eventId);
      return run(async () => {
        const { data, error } = await client
          .from('reports')
          .select('id, reason, note, created_at')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (error) throw classifyError(error);
        return (data ?? []).map((row) => ({
          id: row.id,
          reason: row.reason,
          note: row.note,
          createdAt: row.created_at,
        }));
      });
    },

    setCoverImage: async (eventId, uploadId, images, input) => {
      assertId(eventId);
      assertId(uploadId);
      const files = coverImageFiles(eventId, uploadId);
      const previous = await currentImagePath(eventId);
      const bucket = client.storage.from(EVENT_IMAGES_BUCKET);

      for (const [file, blob] of [
        [files.small, images.small],
        [files.large, images.large],
      ] as const) {
        const { error } = await run(() =>
          bucket.upload(file, blob, {
            contentType: 'image/webp',
            // A new name per upload, so files never change: cache for a year.
            cacheControl: '31536000',
            upsert: false,
          }),
        );
        if (error) {
          await removeImageFiles(files.path);
          throw storageError(error);
        }
      }

      const { data, error } = await run(async () =>
        client
          .from('events')
          .update({
            cover_image_path: files.path,
            cover_image_rights: input.rights,
            cover_image_alt: input.alt.trim(),
            cover_image_credit: input.credit?.trim() || null,
          })
          .eq('id', eventId)
          .select(EVENT_SELECT)
          .maybeSingle(),
      );
      if (error || !data) {
        // Nothing points at the new files: remove them rather than orphan them.
        await removeImageFiles(files.path);
        if (error) throw classifyError(error);
        throw new EventRepositoryError('not_found', 'Event not found.');
      }
      if (previous) await removeImageFiles(previous);
      return toEvent(data as EventRow);
    },

    removeCoverImage: async (eventId) => {
      assertId(eventId);
      const previous = await currentImagePath(eventId);
      const { data, error } = await run(async () =>
        client
          .from('events')
          .update({
            cover_image_path: null,
            cover_image_rights: null,
            cover_image_alt: null,
            cover_image_credit: null,
          })
          .eq('id', eventId)
          .select(EVENT_SELECT)
          .maybeSingle(),
      );
      if (error) throw classifyError(error);
      if (!data)
        throw new EventRepositoryError('not_found', 'Event not found.');
      if (previous) await removeImageFiles(previous);
      return toEvent(data as EventRow);
    },

    translate: async (eventId, target) => {
      assertId(eventId);
      const { data, error } = await run(() =>
        client.functions.invoke('translate-event', {
          body: { eventId, target },
        }),
      );
      if (error) {
        const status = (error as { context?: { status?: number } }).context
          ?.status;
        if (status === 404) {
          throw new EventRepositoryError('not_found', 'Event not found.');
        }
        throw new EventRepositoryError(
          'unavailable',
          'Translation is not available.',
          status === 503 ? 'not_configured' : status ? String(status) : null,
        );
      }
      const body = data as Partial<EventTranslation> | null;
      if (
        typeof body?.title !== 'string' ||
        typeof body.description !== 'string'
      ) {
        throw new EventRepositoryError(
          'unavailable',
          'Translation answer is malformed.',
        );
      }
      return { title: body.title, description: body.description };
    },

    report: async ({ eventId, reason, note, clientRequestId, consent }) => {
      assertId(eventId);
      if (consentProblem(consent)) {
        throw new EventRepositoryError(
          'invalid_input',
          'Report consent is missing or incomplete.',
        );
      }
      if (!UUID.test(clientRequestId)) {
        throw new EventRepositoryError(
          'invalid_input',
          'Report request id is not valid.',
        );
      }
      if (!(REPORT_REASONS as readonly string[]).includes(reason)) {
        throw new EventRepositoryError(
          'invalid_input',
          'Report reason is not valid.',
        );
      }
      const trimmed = note?.trim() ?? '';
      if (trimmed.length > REPORT_NOTE_MAX) {
        throw new EventRepositoryError(
          'invalid_input',
          `Report note is longer than ${REPORT_NOTE_MAX} characters.`,
        );
      }
      return run(async () => {
        // No .select(): reporters cannot read reports back (RLS).
        const { error } = await client.from('reports').insert({
          event_id: eventId,
          reason,
          note: trimmed === '' ? null : trimmed,
          client_request_id: clientRequestId,
          ...consentColumns(consent),
        });
        // The only unique key a client can hit is (event, request id): this
        // exact report was already saved by an earlier attempt.
        if (error?.code === '23505') return;
        if (error) throw classifyError(error);
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
