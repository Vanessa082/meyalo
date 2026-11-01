import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeEvent } from '../test-support/event-fixtures.ts';
import type { PublicationStatus } from '../types/event.type.ts';
import {
  allowedPublicationChanges,
  checkInputProblem,
  completenessIssues,
  freshness,
  isPubliclyVisible,
  PUBLICATION_STATUSES,
  PUBLICATION_TRANSITIONS,
  publicationChangeBlocker,
} from './event-domain.ts';

const NOW = new Date('2026-10-03T12:00:00.000Z');

describe('publication transitions', () => {
  const confirmed = makeEvent({ verificationState: 'source_confirmed' });

  it('allows each listed transition for a confirmed upcoming event', () => {
    for (const from of PUBLICATION_STATUSES) {
      for (const to of PUBLICATION_TRANSITIONS[from]) {
        assert.equal(
          publicationChangeBlocker(
            { ...confirmed, publicationStatus: from },
            to,
            NOW,
          ),
          null,
          `${from} -> ${to}`,
        );
      }
    }
  });

  it('rejects every transition not in the map, including staying put', () => {
    for (const from of PUBLICATION_STATUSES) {
      for (const to of PUBLICATION_STATUSES) {
        if (PUBLICATION_TRANSITIONS[from].includes(to)) continue;
        assert.ok(
          publicationChangeBlocker(
            { ...confirmed, publicationStatus: from },
            to,
            NOW,
          ),
          `${from} -> ${to} should be blocked`,
        );
      }
    }
  });

  it('matches the transition list in 005_curation.sql', () => {
    const expected: Record<PublicationStatus, PublicationStatus[]> = {
      draft: ['published', 'under_review', 'cancelled'],
      under_review: ['published', 'draft', 'cancelled'],
      published: ['under_review', 'cancelled', 'ended'],
      cancelled: ['draft'],
      ended: [],
    };
    assert.deepEqual(PUBLICATION_TRANSITIONS, expected);
  });

  it('will not publish an unreviewed or finished event', () => {
    assert.match(
      publicationChangeBlocker(makeEvent(), 'published', NOW) ?? '',
      /check before publishing/,
    );
    assert.match(
      publicationChangeBlocker(
        makeEvent({
          verificationState: 'organizer_confirmed',
          startAt: '2026-09-01T08:00:00.000Z',
          endAt: '2026-09-01T10:00:00.000Z',
        }),
        'published',
        NOW,
      ) ?? '',
      /already finished/,
    );
    assert.deepEqual(allowedPublicationChanges(makeEvent(), NOW), [
      'under_review',
      'cancelled',
    ]);
  });

  it('only counts published and confirmed events as public', () => {
    assert.equal(isPubliclyVisible(makeEvent()), false);
    assert.equal(
      isPubliclyVisible(
        makeEvent({
          publicationStatus: 'published',
          verificationState: 'source_confirmed',
        }),
      ),
      true,
    );
  });
});

describe('checkInputProblem', () => {
  const base = {
    eventId: '1f6c6fa9-ce6f-4848-bc92-13723ff49dca',
    state: 'source_confirmed' as const,
    method: 'official_site' as const,
    evidenceUrl: 'https://organizer.example/event',
    redFlags: [],
    chargesFee: false,
    notes: null,
  };

  it('accepts a clean confirmation and a rejection with flags', () => {
    assert.equal(checkInputProblem(base), null);
    assert.equal(
      checkInputProblem({
        ...base,
        state: 'unreviewed',
        redFlags: ['lookalike_domain'],
      }),
      null,
    );
  });

  it('mirrors the database rules with messages a curator can act on', () => {
    assert.match(
      checkInputProblem({ ...base, redFlags: ['guaranteed_award'] }) ?? '',
      /red flag/i,
    );
    assert.match(
      checkInputProblem({ ...base, state: 'organizer_confirmed' }) ?? '',
      /organizer/i,
    );
    assert.match(
      checkInputProblem({ ...base, evidenceUrl: 'http://x.example' }) ?? '',
      /https/i,
    );
    assert.match(
      checkInputProblem({ ...base, notes: 'x'.repeat(2001) }) ?? '',
      /2000/,
    );
  });
});
describe('freshness', () => {
  const base = makeEvent({
    publicationStatus: 'published',
    verificationState: 'source_confirmed',
    startAt: '2026-10-30T08:00:00.000Z',
    endAt: null,
  });

  it('flags confirmed events never checked, stale, and due for re-check', () => {
    assert.equal(freshness(base, NOW).kind, 'never_checked');
    assert.equal(
      freshness({ ...base, lastCheckedAt: '2026-09-15T00:00:00.000Z' }, NOW)
        .kind,
      'stale',
    );
    assert.equal(
      freshness(
        {
          ...base,
          startAt: '2026-10-06T08:00:00.000Z',
          lastCheckedAt: '2026-09-25T00:00:00.000Z',
        },
        NOW,
      ).kind,
      'recheck_due',
    );
    assert.equal(
      freshness({ ...base, lastCheckedAt: '2026-10-01T00:00:00.000Z' }, NOW)
        .kind,
      'fresh',
    );
  });

  it('does not treat unreviewed or past events as stale', () => {
    assert.equal(freshness(makeEvent(), NOW).kind, 'not_reviewed');
    assert.equal(
      freshness({ ...base, startAt: '2026-09-01T08:00:00.000Z' }, NOW).kind,
      'not_applicable',
    );
  });
});

describe('completenessIssues', () => {
  it('lists what is missing without blocking', () => {
    assert.deepEqual(completenessIssues(makeEvent()), []);
    assert.deepEqual(
      completenessIssues(
        makeEvent({
          endAt: null,
          venueName: null,
          latitude: null,
          registrationUrl: null,
          priceType: 'unknown',
          topics: [],
          organizerId: null,
        }),
      ),
      [
        'end_time_missing',
        'venue_missing',
        'coordinates_missing',
        'registration_link_missing',
        'price_not_stated',
        'topics_missing',
        'organizer_not_linked',
      ],
    );
  });
});
