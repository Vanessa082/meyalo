import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consent } from '../types/consent.type.ts';
import {
  classifyError,
  createEventRepository,
  EventRepositoryError,
  rowToEvent,
} from './event-repository.ts';

/** A client that fails the test if the repository reaches the network. */
const untouchableClient = new Proxy(
  {},
  {
    get() {
      throw new Error('The repository should have rejected this input first.');
    },
  },
) as SupabaseClient;

function isKind(kind: EventRepositoryError['kind']) {
  return (error: unknown) =>
    error instanceof EventRepositoryError && error.kind === kind;
}

describe('classifyError', () => {
  it('keeps failure kinds distinct', () => {
    assert.equal(classifyError({ code: '42501' }).kind, 'unauthorized');
    assert.equal(classifyError({ code: 'PGRST301' }).kind, 'unauthorized');
    assert.equal(classifyError({ code: 'P0002' }).kind, 'not_found');
    assert.equal(classifyError({ code: '40001' }).kind, 'conflict');
    assert.equal(classifyError({ code: '23514' }).kind, 'invalid_input');
    assert.equal(classifyError({ code: '22P02' }).kind, 'invalid_input');
    assert.equal(classifyError({ code: '08006' }).kind, 'unavailable');
    assert.equal(
      classifyError({ message: 'fetch failed' }).kind,
      'unavailable',
    );
  });
});

describe('repository input checks', () => {
  const repository = createEventRepository(untouchableClient);

  it('rejects malformed ids, page sizes, cursors and dates locally', async () => {
    await assert.rejects(repository.getById('42'), isKind('invalid_input'));
    await assert.rejects(
      repository.list({ limit: 0 }),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.list({ limit: 101 }),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.list({
        sort: 'start_asc',
        cursor: {
          sort: 'updated_desc',
          value: '2026-10-01T00:00:00Z',
          id: '11111111-1111-4111-8111-111111111111',
        },
      }),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.list({ filters: { startsFrom: 'next week' } }),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.changePublication('nope', 'draft', 'published'),
      isKind('invalid_input'),
    );
  });
});

describe('rowToEvent', () => {
  it('builds the image URLs, and never shows an image without alt text', () => {
    const base = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'T',
      description: 'D',
      category: 'C',
      format: 'in_person',
      start_at: '2026-11-10T08:00:00+00:00',
      end_at: null,
      timezone: 'Africa/Douala',
      registration_deadline: null,
      city: 'Douala',
      country_code: 'CM',
      venue_name: null,
      address: null,
      latitude: null,
      longitude: null,
      virtual_access_type: null,
      organizer_id: null,
      organizer_name: 'O',
      price_type: 'free',
      currency: null,
      price_min: null,
      price_max: null,
      source_url: 'https://example.org',
      source_type: 'organizer_site',
      registration_url: null,
      verification_state: 'source_confirmed',
      last_checked_at: null,
      publication_status: 'published',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      event_topics: [],
      event_offers: [],
      event_languages: [],
    } as const;
    const url = (file: string) => `https://cdn.example/${file}`;
    const event = rowToEvent(
      {
        ...base,
        cover_image_path: 'evt/abc',
        cover_image_alt: 'A speaker on stage',
        cover_image_credit: null,
      } as never,
      url,
    );
    assert.deepEqual(event.coverImage, {
      path: 'evt/abc',
      smallUrl: 'https://cdn.example/evt/abc-640.webp',
      largeUrl: 'https://cdn.example/evt/abc-1600.webp',
      alt: 'A speaker on stage',
      credit: null,
      rights: null,
    });
    assert.equal(rowToEvent(base as never, url).coverImage, null);
    assert.equal(
      rowToEvent({ ...base, cover_image_path: 'evt/abc' } as never, url)
        .coverImage,
      null,
    );
  });

  it('converts a row explicitly and sorts junction values', () => {
    const event = rowToEvent({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'T',
      description: 'D',
      category: 'C',
      format: 'hybrid',
      start_at: '2026-11-10T08:00:00+00:00',
      end_at: null,
      timezone: 'Africa/Douala',
      registration_deadline: null,
      city: 'Douala',
      country_code: 'CM',
      venue_name: null,
      address: null,
      latitude: null,
      longitude: null,
      virtual_access_type: null,
      organizer_id: null,
      organizer_name: 'O',
      price_type: null,
      currency: 'XAF',
      price_min: '5000.00',
      price_max: null,
      source_url: 'https://example.org',
      source_type: 'collector',
      registration_url: null,
      source_submission_id: null,
      verification_state: 'unreviewed',
      last_checked_at: null,
      checked_by: null,
      publication_status: 'draft',
      created_at: null,
      updated_at: '2026-10-01T00:00:00.123456+00:00',
      event_topics: [{ topic_id: 'technology' }, { topic_id: 'business' }],
      event_offers: null,
      event_languages: [{ language_code: 'fr' }],
    });
    assert.deepEqual(event.topics, ['business', 'technology']);
    assert.deepEqual(event.offers, []);
    assert.equal(event.priceMin, 5000);
    assert.equal(event.priceType, 'unknown');
    assert.equal(event.updatedAt, '2026-10-01T00:00:00.123456+00:00');
    assert.equal('start_at' in event, false);
  });
});

describe('report', () => {
  const EVENT_ID = '1f6c6fa9-ce6f-4848-bc92-13723ff49dca';
  const REQUEST_ID = '7d3b0e1c-2f4a-4c6b-9d8e-0a1b2c3d4e5f';
  const CONSENT: Consent = {
    version: '2026-10-19',
    language: 'fr',
    ageGroup: '18_plus',
    guardianConsent: false,
  };

  /** Records the insert and answers like PostgREST with return=minimal. */
  function recordingClient(result: {
    error: { code?: string; message?: string } | null;
  }) {
    const calls: { table: string; payload: unknown }[] = [];
    const client = {
      from: (table: string) => ({
        insert: async (payload: unknown) => {
          calls.push({ table, payload });
          return result;
        },
      }),
    } as unknown as SupabaseClient;
    return { client, calls };
  }

  const report = (overrides = {}) => ({
    eventId: EVENT_ID,
    reason: 'scam' as const,
    note: null,
    clientRequestId: REQUEST_ID,
    consent: CONSENT,
    ...overrides,
  });

  it('rejects invalid ids, reason or oversize note before the network', async () => {
    const repository = createEventRepository(untouchableClient);
    await assert.rejects(
      repository.report(report({ eventId: 'nope' })),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.report(report({ clientRequestId: 'nope' })),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.report(report({ reason: 'not_a_reason' as never })),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.report(report({ reason: 'other', note: 'x'.repeat(501) })),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.report(report({ consent: undefined })),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.report(
        report({ consent: { ...CONSENT, ageGroup: 'under_18' } }),
      ),
      isKind('invalid_input'),
    );
  });

  it('inserts the report with its request id and a trimmed note', async () => {
    const { client, calls } = recordingClient({ error: null });
    const repository = createEventRepository(client);
    await repository.report(
      report({ reason: 'wrong_place', note: '  Moved to the annex  ' }),
    );
    await repository.report(report({ note: '   ' }));
    assert.deepEqual(calls, [
      {
        table: 'reports',
        payload: {
          event_id: EVENT_ID,
          reason: 'wrong_place',
          note: 'Moved to the annex',
          client_request_id: REQUEST_ID,
          consent_version: '2026-10-19',
          consent_language: 'fr',
          age_group: '18_plus',
          guardian_consent: null,
        },
      },
      {
        table: 'reports',
        payload: {
          event_id: EVENT_ID,
          reason: 'scam',
          note: null,
          client_request_id: REQUEST_ID,
          consent_version: '2026-10-19',
          consent_language: 'fr',
          age_group: '18_plus',
          guardian_consent: null,
        },
      },
    ]);
  });

  it('treats a replay of an already saved report as sent', async () => {
    const { client } = recordingClient({
      error: { code: '23505', message: 'duplicate key value' },
    });
    await createEventRepository(client).report(report());
  });

  it('says so when the rate limit is reached', async () => {
    const { client } = recordingClient({
      error: { code: 'PT429', message: 'too many reports' },
    });
    await assert.rejects(
      createEventRepository(client).report(report()),
      isKind('rate_limited'),
    );
  });

  it('fails loudly when the database refuses the report', async () => {
    const { client } = recordingClient({
      error: { code: '42501', message: 'permission denied' },
    });
    await assert.rejects(
      createEventRepository(client).report(report()),
      isKind('unauthorized'),
    );
  });
});

describe('recordCheck', () => {
  const EVENT_ID = '1f6c6fa9-ce6f-4848-bc92-13723ff49dca';
  const input = {
    eventId: EVENT_ID,
    state: 'source_confirmed' as const,
    method: 'official_site' as const,
    evidenceUrl: 'https://organizer.example/event',
    redFlags: [],
    chargesFee: true,
    notes: '  Fee shown on the page  ',
  };

  it('refuses a check that breaks a rule before the network', async () => {
    const repository = createEventRepository(untouchableClient);
    await assert.rejects(
      repository.recordCheck({ ...input, redFlags: ['guaranteed_award'] }),
      isKind('invalid_input'),
    );
    await assert.rejects(
      repository.recordCheck({ ...input, eventId: 'nope' }),
      isKind('invalid_input'),
    );
  });

  it('calls record_check with every field and returns its result', async () => {
    const calls: { fn: string; args: unknown }[] = [];
    const client = {
      rpc: async (fn: string, args: unknown) => {
        calls.push({ fn, args });
        return { data: 'needs_second_review', error: null };
      },
    } as unknown as SupabaseClient;
    const result = await createEventRepository(client).recordCheck(input);
    assert.equal(result, 'needs_second_review');
    assert.deepEqual(calls, [
      {
        fn: 'record_check',
        args: {
          p_event_id: EVENT_ID,
          p_state: 'source_confirmed',
          p_method: 'official_site',
          p_evidence_url: 'https://organizer.example/event',
          p_red_flags: [],
          p_charges_fee: true,
          p_notes: 'Fee shown on the page',
        },
      },
    ]);
  });

  it('fails loudly on an unexpected answer or a refusal', async () => {
    const answering = (data: unknown, error: unknown = null) =>
      ({ rpc: async () => ({ data, error }) }) as unknown as SupabaseClient;
    await assert.rejects(
      createEventRepository(answering('maybe')).recordCheck(input),
      isKind('unavailable'),
    );
    await assert.rejects(
      createEventRepository(
        answering(null, { code: '42501', message: 'only curators' }),
      ).recordCheck(input),
      isKind('unauthorized'),
    );
  });
});
