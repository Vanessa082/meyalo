import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  makeEvent,
  TAXONOMY,
  validFormValues,
} from '../test-support/event-fixtures.ts';
import type { Event } from '../types/event.type.ts';
import {
  createEventCuration,
  EventRuleError,
  EventValidationError,
} from './event-curation.ts';
import {
  type EventRepository,
  EventRepositoryError,
} from './event-repository.ts';

const NOW = new Date('2026-10-03T12:00:00.000Z');

function fakeRepository(overrides: Partial<EventRepository> = {}) {
  const calls: string[] = [];
  const fail = (name: string) => async () => {
    calls.push(name);
    throw new Error(`${name} was not expected`);
  };
  const repository: EventRepository = {
    getById: fail('getById'),
    list: fail('list'),
    listPublished: fail('listPublished'),
    getPublishedById: fail('getPublishedById'),
    create: fail('create'),
    update: fail('update'),
    changePublication: fail('changePublication'),
    recordCheck: fail('recordCheck'),
    listChecks: fail('listChecks'),
    listReports: fail('listReports'),
    listTaxonomy: async () => TAXONOMY,
    ...overrides,
  };
  return { repository, calls };
}

describe('createEventCuration', () => {
  it('rejects invalid input before reaching the repository', async () => {
    const { repository, calls } = fakeRepository();
    const curation = createEventCuration(repository, () => NOW);
    await assert.rejects(
      curation.create(validFormValues({ sourceUrl: 'not a url' })),
      (error: unknown) =>
        error instanceof EventValidationError &&
        Boolean(error.fieldErrors.sourceUrl),
    );
    assert.deepEqual(calls, []);
  });

  it('saves validated input against the loaded version', async () => {
    const event = makeEvent({ updatedAt: '2026-10-02T10:00:00.123456+00:00' });
    let received: unknown[] = [];
    const saved: Event = { ...event, title: 'Renamed' };
    const { repository } = fakeRepository({
      update: async (...args) => {
        received = args;
        return saved;
      },
    });
    const curation = createEventCuration(repository, () => NOW);
    const result = await curation.update(
      event,
      validFormValues({ title: '  Renamed ' }),
    );
    assert.equal(result, saved);
    assert.equal(received[0], event.id);
    assert.equal(received[1], event.updatedAt);
    assert.equal((received[2] as { title: string }).title, 'Renamed');
  });

  it('propagates a failed save instead of reporting success', async () => {
    const { repository } = fakeRepository({
      update: async () => {
        throw new EventRepositoryError('conflict', 'changed', '40001');
      },
    });
    const curation = createEventCuration(repository, () => NOW);
    await assert.rejects(
      curation.update(makeEvent(), validFormValues()),
      (error: unknown) =>
        error instanceof EventRepositoryError && error.kind === 'conflict',
    );
  });

  it('rejects an invalid transition without writing', async () => {
    const { repository, calls } = fakeRepository();
    const curation = createEventCuration(repository, () => NOW);
    await assert.rejects(
      curation.changePublication(makeEvent(), 'ended'),
      EventRuleError,
    );
    await assert.rejects(
      curation.changePublication(makeEvent(), 'published'),
      /check before publishing/,
    );
    assert.deepEqual(calls, []);
  });

  it('passes a valid transition with the expected current status', async () => {
    let received: unknown[] = [];
    const event = makeEvent({ verificationState: 'source_confirmed' });
    const { repository } = fakeRepository({
      changePublication: async (...args) => {
        received = args;
        return { ...event, publicationStatus: 'published' };
      },
    });
    const curation = createEventCuration(repository, () => NOW);
    const result = await curation.changePublication(event, 'published');
    assert.equal(result.publicationStatus, 'published');
    assert.deepEqual(received, [event.id, 'draft', 'published']);
  });
});
