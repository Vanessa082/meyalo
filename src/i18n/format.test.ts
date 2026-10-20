import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatDayHeading,
  formatMonthYear,
  formatTimeAgo,
  weekdayInitials,
} from './format.ts';

describe('formatMonthYear', () => {
  it('names the current month, not a fixed one', () => {
    const october = new Date('2026-10-18T08:00:00Z');
    assert.equal(formatMonthYear(october, 'en'), 'October 2026');
    assert.equal(formatMonthYear(october, 'fr'), 'Octobre 2026');
  });

  it('uses the Cameroon day at month boundaries', () => {
    // 23:30 UTC on 31 Oct is 00:30 on 1 Nov in Douala (UTC+1).
    const edge = new Date('2026-10-31T23:30:00Z');
    assert.equal(formatMonthYear(edge, 'en'), 'November 2026');
  });
});

describe('formatTimeAgo', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it('says just now under a minute', () => {
    assert.equal(formatTimeAgo(ago(20_000), now, 'en'), 'just now');
    assert.equal(formatTimeAgo(ago(20_000), now, 'fr'), "à l'instant");
  });

  it('uses the largest whole unit', () => {
    assert.equal(formatTimeAgo(ago(5 * 60_000), now, 'en'), '5 minutes ago');
    assert.equal(formatTimeAgo(ago(3 * 3_600_000), now, 'en'), '3 hours ago');
    assert.equal(formatTimeAgo(ago(2 * 86_400_000), now, 'en'), '2 days ago');
    assert.equal(
      formatTimeAgo(ago(3 * 3_600_000), now, 'fr'),
      'il y a 3 heures',
    );
  });
});

describe('formatDayHeading', () => {
  it('names a calendar day in the app language', () => {
    assert.equal(formatDayHeading('2026-10-24', 'en'), 'Saturday 24 October');
    assert.equal(formatDayHeading('2026-10-24', 'fr'), 'samedi 24 octobre');
  });
});

describe('weekdayInitials', () => {
  it('starts the week on Monday', () => {
    assert.deepEqual(weekdayInitials('en'), [
      'M',
      'T',
      'W',
      'T',
      'F',
      'S',
      'S',
    ]);
    assert.deepEqual(weekdayInitials('fr'), [
      'L',
      'M',
      'M',
      'J',
      'V',
      'S',
      'D',
    ]);
  });
});
