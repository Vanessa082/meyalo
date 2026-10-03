import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
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
