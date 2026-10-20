import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '../types/event.type.ts';
import { matchesQuickFilters } from './quick-filters.ts';

function event(overrides: Partial<EventCardData> = {}): EventCardData {
  return {
    id: 'evt',
    slug: 'evt',
    title: 'Pitch night',
    organizerName: 'Hub',
    eventType: 'Meetup',
    primaryCategory: 'Meetup',
    startsAt: '2026-10-21T17:00:00Z',
    timezone: 'Africa/Douala',
    format: 'in_person',
    priceType: 'paid',
    priceMin: 2000,
    priceMax: 2000,
    currency: 'XAF',
    status: 'scheduled',
    topics: [],
    offers: [],
    languages: ['en'],
    ...overrides,
  };
}

// Monday 19 October 2026, 10:00 in Douala (UTC+1).
const monday = new Date('2026-10-19T09:00:00Z');

describe('matchesQuickFilters', () => {
  it('lets everything through when no chip is on', () => {
    assert.equal(matchesQuickFilters(event(), [], monday), true);
  });

  describe('this weekend', () => {
    it('matches the coming Saturday and Sunday in the event timezone', () => {
      const saturday = event({ startsAt: '2026-10-24T09:00:00Z' });
      const sunday = event({ startsAt: '2026-10-25T20:00:00Z' });
      assert.equal(matchesQuickFilters(saturday, ['weekend'], monday), true);
      assert.equal(matchesQuickFilters(sunday, ['weekend'], monday), true);
    });

    it('excludes weekdays and the weekend after', () => {
      const friday = event({ startsAt: '2026-10-23T18:00:00Z' });
      const nextSaturday = event({ startsAt: '2026-10-31T09:00:00Z' });
      assert.equal(matchesQuickFilters(friday, ['weekend'], monday), false);
      assert.equal(
        matchesQuickFilters(nextSaturday, ['weekend'], monday),
        false,
      );
    });

    it('uses the local date: 23:30 UTC Saturday is already Sunday in Douala', () => {
      const lateSaturday = event({ startsAt: '2026-10-24T23:30:00Z' });
      assert.equal(
        matchesQuickFilters(lateSaturday, ['weekend'], monday),
        true,
      );
      // Friday 23:30 UTC is Saturday 00:30 in Douala.
      const lateFriday = event({ startsAt: '2026-10-23T23:30:00Z' });
      assert.equal(matchesQuickFilters(lateFriday, ['weekend'], monday), true);
    });

    it('on a Sunday means today only', () => {
      const sundayNow = new Date('2026-10-25T08:00:00Z');
      const today = event({ startsAt: '2026-10-25T15:00:00Z' });
      const nextSaturday = event({ startsAt: '2026-10-31T09:00:00Z' });
      assert.equal(matchesQuickFilters(today, ['weekend'], sundayNow), true);
      assert.equal(
        matchesQuickFilters(nextSaturday, ['weekend'], sundayNow),
        false,
      );
    });

    it('falls back to the region timezone when the event has none', () => {
      const saturday = event({
        startsAt: '2026-10-24T09:00:00Z',
        timezone: '',
      });
      assert.equal(matchesQuickFilters(saturday, ['weekend'], monday), true);
    });
  });

  it('free means free or free with registration, never unknown', () => {
    assert.equal(
      matchesQuickFilters(event({ priceType: 'free' }), ['free'], monday),
      true,
    );
    assert.equal(
      matchesQuickFilters(
        event({ priceType: 'free_with_registration' }),
        ['free'],
        monday,
      ),
      true,
    );
    assert.equal(
      matchesQuickFilters(event({ priceType: 'unknown' }), ['free'], monday),
      false,
    );
    assert.equal(matchesQuickFilters(event(), ['free'], monday), false);
  });

  it('online means virtual or hybrid', () => {
    assert.equal(
      matchesQuickFilters(event({ format: 'virtual' }), ['online'], monday),
      true,
    );
    assert.equal(
      matchesQuickFilters(event({ format: 'hybrid' }), ['online'], monday),
      true,
    );
    assert.equal(matchesQuickFilters(event(), ['online'], monday), false);
  });

  describe('registration closing soon', () => {
    it('matches a deadline within the next 7 days', () => {
      const soon = event({ registrationDeadline: '2026-10-25T22:00:00Z' });
      assert.equal(matchesQuickFilters(soon, ['closingSoon'], monday), true);
    });

    it('excludes passed, distant and missing deadlines', () => {
      const passed = event({ registrationDeadline: '2026-10-18T22:00:00Z' });
      const distant = event({ registrationDeadline: '2026-11-10T22:00:00Z' });
      assert.equal(matchesQuickFilters(passed, ['closingSoon'], monday), false);
      assert.equal(
        matchesQuickFilters(distant, ['closingSoon'], monday),
        false,
      );
      assert.equal(
        matchesQuickFilters(event(), ['closingSoon'], monday),
        false,
      );
    });
  });

  it('requires every chip that is on', () => {
    const freeOnline = event({ priceType: 'free', format: 'virtual' });
    assert.equal(
      matchesQuickFilters(freeOnline, ['free', 'online'], monday),
      true,
    );
    assert.equal(
      matchesQuickFilters(
        event({ priceType: 'free' }),
        ['free', 'online'],
        monday,
      ),
      false,
    );
  });
});
