/**
 * Event repository against a local Supabase database with migrations
 * 001–005 applied. Run with `pnpm test:db`:
 *
 *   eval "$(pnpm dlx supabase status -o env)"
 *   SUPABASE_URL=$API_URL SUPABASE_ANON_KEY=$ANON_KEY \
 *     SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY pnpm test:db
 *
 * The service-role client only arranges and removes fixtures stamped with
 * this run's id. Every assertion goes through the repository with a curator,
 * signed-in non-curator, or anonymous session.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validFormValues } from '../test-support/event-fixtures.ts';
import type { Event, EventInput } from '../types/event.type.ts';
import {
  createEventRepository,
  type EventRepository,
  EventRepositoryError,
} from './event-repository.ts';
import { validateEventInput } from './event-validation.ts';

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    'Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY for the local stack.',
  );
}
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url)) {
  throw new Error('Database tests only run against a local Supabase stack.');
}

const stamp = `dbtest-${Date.now()}`;
const city = `Testville ${stamp}`;
const password = 'Db-test-password-1';
const options = { auth: { persistSession: false, autoRefreshToken: false } };

const service = createClient(url, serviceKey, options);
const userIds: string[] = [];

let curatorClient: SupabaseClient;
let curatorId: string;
let curator: EventRepository;
let member: EventRepository;
let memberClient: SupabaseClient;
let anon: EventRepository;
let anonClient: SupabaseClient;

/** Fixture ids, in start order. b and c share a start time. */
const ids = { a: '', b: '', c: '', draft: '' };

function isKind(kind: EventRepositoryError['kind']) {
  return (error: unknown) => {
    assert.ok(error instanceof EventRepositoryError, String(error));
    assert.equal(error.kind, kind, `${error.kind}: ${error.message}`);
    return true;
  };
}

async function signedIn(label: string): Promise<{
  client: SupabaseClient;
  id: string;
}> {
  const email = `${stamp}-${label}@example.test`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  userIds.push(created.data.user.id);
  const client = createClient(url, anonKey, options);
  const session = await client.auth.signInWithPassword({ email, password });
  if (session.error) throw session.error;
  return { client, id: created.data.user.id };
}

function input(overrides: Parameters<typeof validFormValues>[0] = {}) {
  const result = validateEventInput(
    validFormValues({
      title: `${stamp} created`,
      city,
      organizerName: `${stamp} organizer`,
      topics: ['technology'],
      offers: ['networking'],
      languages: ['en', 'fr'],
      startAt: '2027-03-10 09:00',
      endAt: '2027-03-10 12:00',
      ...overrides,
    }),
    { topics: ['technology', 'business'], offers: ['networking'] },
  );
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value as EventInput;
}

async function insertFixture(
  title: string,
  startAt: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const { data, error } = await service
    .from('events')
    .insert({
      title: `${stamp} ${title}`,
      description: 'Database test fixture',
      category: 'Test',
      format: 'in_person',
      start_at: startAt,
      timezone: 'Africa/Douala',
      city,
      country_code: 'CM',
      organizer_name: `${stamp} fixture organizer`,
      source_url: `https://example.org/${stamp}/${title}`,
      source_type: 'organizer_site',
      price_type: 'unknown',
      publication_status: 'published',
      verification_state: 'source_confirmed',
      last_checked_at: '2026-01-01T00:00:00Z',
      ...extra,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function storedRow(id: string) {
  const { data, error } = await service
    .from('events')
    .select('title, publication_status, verification_state, checked_by')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

before(async () => {
  const curatorUser = await signedIn('curator');
  const role = await service
    .from('user_roles')
    .insert({ user_id: curatorUser.id, role: 'admin' });
  if (role.error) throw role.error;
  curatorClient = curatorUser.client;
  curatorId = curatorUser.id;
  curator = createEventRepository(curatorClient);

  const memberUser = await signedIn('member');
  memberClient = memberUser.client;
  member = createEventRepository(memberClient);

  anonClient = createClient(url, anonKey, options);
  anon = createEventRepository(anonClient);

  ids.a = await insertFixture('alpha', '2027-01-01T08:00:00Z');
  ids.b = await insertFixture('bravo', '2027-01-02T08:00:00Z', {
    format: 'virtual',
    city: null,
    country_code: null,
    organizer_name: `${stamp} bravo organizer`,
  });
  ids.c = await insertFixture('charlie', '2027-01-02T08:00:00Z', {
    last_checked_at: '2026-09-30T00:00:00Z',
  });
  ids.draft = await insertFixture('draft', '2027-01-03T08:00:00Z', {
    publication_status: 'draft',
    verification_state: 'unreviewed',
    last_checked_at: null,
  });
  const topic = await service
    .from('event_topics')
    .insert({ event_id: ids.a, topic_id: 'technology' });
  if (topic.error) throw topic.error;
});

after(async () => {
  await service.from('events').delete().like('title', `${stamp}%`);
  await service.from('organizers').delete().like('name', `${stamp}%`);
  for (const id of userIds) await service.auth.admin.deleteUser(id);
});

/** Fixture events only, whatever else is in the local database. */
const mine = { search: stamp };

describe('reading events', () => {
  it('gets an event by id as the canonical type', async () => {
    const event = await curator.getById(ids.a);
    assert.equal(event.title, `${stamp} alpha`);
    assert.deepEqual(event.topics, ['technology']);
    assert.equal(event.publicationStatus, 'published');
    assert.equal('publication_status' in event, false);
  });

  it('reports a missing event as not_found and a bad id as invalid_input', async () => {
    await assert.rejects(curator.getById(randomUUID()), isKind('not_found'));
    await assert.rejects(curator.getById('abc'), isKind('invalid_input'));
  });

  it('returns an empty page, not an error, when nothing matches', async () => {
    const page = await curator.list({
      filters: { search: `${stamp} no such event` },
    });
    assert.deepEqual(page, { items: [], nextCursor: null });
  });

  it('orders explicitly by start, then id', async () => {
    const [b, c] = [ids.b, ids.c].sort();
    const asc = await curator.list({ filters: mine, sort: 'start_asc' });
    assert.deepEqual(
      asc.items.map((event) => event.id),
      [ids.a, b, c, ids.draft],
    );
    const desc = await curator.list({ filters: mine, sort: 'start_desc' });
    assert.deepEqual(
      desc.items.map((event) => event.id),
      [ids.draft, c, b, ids.a],
    );
  });

  it('pages with a cursor without gaps or repeats, including through a tie', async () => {
    const seen: string[] = [];
    let cursor = null;
    let pages = 0;
    do {
      const page: Awaited<ReturnType<EventRepository['list']>> =
        await curator.list({ filters: mine, limit: 1, cursor });
      seen.push(...page.items.map((event) => event.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 10);
    assert.equal(pages, 4);
    assert.equal(new Set(seen).size, 4);
  });

  it('filters by status, verification, format, city, country and dates', async () => {
    const titles = async (filters: Record<string, unknown>) =>
      (await curator.list({ filters: { ...mine, ...filters } })).items
        .map((event) => event.title.replace(`${stamp} `, ''))
        .sort();

    assert.deepEqual(await titles({ publicationStatuses: ['draft'] }), [
      'draft',
    ]);
    assert.deepEqual(await titles({ verificationStates: ['unreviewed'] }), [
      'draft',
    ]);
    assert.deepEqual(await titles({ formats: ['virtual'] }), ['bravo']);
    assert.deepEqual(await titles({ city: city.toUpperCase() }), [
      'alpha',
      'charlie',
      'draft',
    ]);
    assert.deepEqual(await titles({ countryCode: 'cm' }), [
      'alpha',
      'charlie',
      'draft',
    ]);
    assert.deepEqual(
      await titles({
        startsFrom: '2027-01-02T00:00:00Z',
        startsBefore: '2027-01-03T00:00:00Z',
      }),
      ['bravo', 'charlie'],
    );
  });

  it('combines stale-check, search and cursor conditions correctly', async () => {
    const filters = { ...mine, lastCheckedBefore: '2026-06-01T00:00:00Z' };
    const first = await curator.list({ filters, limit: 1 });
    assert.equal(first.items[0]?.id, ids.a);
    assert.ok(first.nextCursor);
    const rest = await curator.list({
      filters,
      limit: 10,
      cursor: first.nextCursor,
    });
    // charlie was checked recently; draft has never been checked.
    assert.deepEqual(
      rest.items.map((event) => event.id),
      [ids.b, ids.draft],
    );
  });

  it('never shows drafts through the published path, even to a curator', async () => {
    const page = await curator.listPublished({ filters: mine });
    assert.equal(page.items.length, 3);
    assert.ok(
      page.items.every((event) => event.publicationStatus === 'published'),
    );
    await assert.rejects(
      curator.getPublishedById(ids.draft),
      isKind('not_found'),
    );
  });

  it('hides drafts from anonymous and non-curator sessions', async () => {
    for (const repository of [anon, member]) {
      const page = await repository.list({ filters: mine });
      assert.deepEqual(
        page.items.map((event) => event.id).sort(),
        [ids.a, ids.b, ids.c].sort(),
      );
      await assert.rejects(repository.getById(ids.draft), isKind('not_found'));
    }
  });
});

describe('curator writes', () => {
  let created: Event;

  it('creates a draft with topics, offers and languages', async () => {
    created = await curator.create(input());
    assert.equal(created.publicationStatus, 'draft');
    assert.equal(created.verificationState, 'unreviewed');
    assert.equal(created.lastCheckedAt, null);
    assert.deepEqual(created.topics, ['technology']);
    assert.deepEqual(created.offers, ['networking']);
    assert.deepEqual(created.languages, ['en', 'fr']);
    assert.ok(created.organizerId);
    const reread = await curator.getById(created.id);
    assert.deepEqual(reread, created);
  });

  it('updates against the loaded version and persists the change', async () => {
    const saved = await curator.update(
      created.id,
      created.updatedAt,
      input({ title: `${stamp} created (edited)`, topics: ['business'] }),
    );
    assert.equal(saved.title, `${stamp} created (edited)`);
    assert.deepEqual(saved.topics, ['business']);
    assert.notEqual(saved.updatedAt, created.updatedAt);
    assert.equal((await storedRow(created.id)).title, saved.title);

    await assert.rejects(
      curator.update(created.id, created.updatedAt, input({ title: 'lost' })),
      isKind('conflict'),
    );
    assert.equal((await storedRow(created.id)).title, saved.title);
    created = saved;
  });

  it('rejects an update of a missing event as not_found', async () => {
    await assert.rejects(
      curator.update(randomUUID(), created.updatedAt, input()),
      isKind('not_found'),
    );
  });

  it('lets the database refuse an invalid transition', async () => {
    await assert.rejects(
      curator.changePublication(created.id, 'draft', 'ended'),
      isKind('invalid_input'),
    );
    await assert.rejects(
      curator.changePublication(created.id, 'draft', 'published'),
      isKind('invalid_input'),
    );
    assert.equal((await storedRow(created.id)).publication_status, 'draft');
  });

  it('records who checked, then publishes through a valid transition', async () => {
    const checked = await curator.recordVerification(
      created.id,
      'source_confirmed',
    );
    assert.equal(checked.verificationState, 'source_confirmed');
    assert.equal(checked.checkedBy, curatorId);
    assert.ok(checked.lastCheckedAt);

    const published = await curator.changePublication(
      created.id,
      'draft',
      'published',
    );
    assert.equal(published.publicationStatus, 'published');
    assert.equal((await anon.getPublishedById(created.id)).id, created.id);
  });

  it('reports a status change from a stale state as a conflict', async () => {
    await assert.rejects(
      curator.changePublication(created.id, 'draft', 'cancelled'),
      isKind('conflict'),
    );
    assert.equal((await storedRow(created.id)).publication_status, 'published');
  });

  it('does not let a client insert skip review or forge who checked', async () => {
    const insert = await curatorClient.from('events').insert({
      title: `${stamp} forged`,
      description: 'x',
      category: 'Test',
      format: 'virtual',
      start_at: '2027-05-01T08:00:00Z',
      organizer_name: `${stamp} organizer`,
      source_url: 'https://example.org/forged',
      source_type: 'collector',
      publication_status: 'published',
      verification_state: 'source_confirmed',
    });
    assert.equal(insert.error?.code, '23514');

    const forged = await curatorClient
      .from('events')
      .update({
        verification_state: 'organizer_confirmed',
        checked_by: randomUUID(),
      })
      .eq('id', created.id)
      .select('checked_by')
      .single();
    assert.equal(forged.error, null);
    assert.equal(forged.data?.checked_by, curatorId);
  });
});

describe('unauthorized access', () => {
  it('rejects create from a non-curator and from anonymous', async () => {
    await assert.rejects(member.create(input()), isKind('unauthorized'));
    await assert.rejects(anon.create(input()), isKind('unauthorized'));
    const { count } = await service
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('title', `${stamp} created`);
    assert.equal(count, 0);
  });

  it('rejects updates and status changes from a non-curator', async () => {
    const event = await member.getById(ids.a);
    await assert.rejects(
      member.update(ids.a, event.updatedAt, input({ title: 'hijacked' })),
      isKind('unauthorized'),
    );
    await assert.rejects(
      member.changePublication(ids.a, 'published', 'cancelled'),
      isKind('unauthorized'),
    );
    await assert.rejects(
      member.recordVerification(ids.a, 'organizer_confirmed'),
      isKind('unauthorized'),
    );
    const stored = await storedRow(ids.a);
    assert.equal(stored.title, `${stamp} alpha`);
    assert.equal(stored.publication_status, 'published');
    assert.equal(stored.verification_state, 'source_confirmed');
  });

  it('does not reveal or change a draft for a non-curator', async () => {
    await assert.rejects(
      member.changePublication(ids.draft, 'draft', 'cancelled'),
      isKind('not_found'),
    );
    assert.equal((await storedRow(ids.draft)).publication_status, 'draft');
  });

  it('rejects anonymous direct writes at the database', async () => {
    const write = await anonClient
      .from('events')
      .update({ title: 'anon' })
      .eq('id', ids.a);
    assert.equal(write.error?.code, '42501');
    await assert.rejects(
      anon.changePublication(ids.a, 'published', 'cancelled'),
      isKind('unauthorized'),
    );
    assert.equal((await storedRow(ids.a)).title, `${stamp} alpha`);
  });
});
