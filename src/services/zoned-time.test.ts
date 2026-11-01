import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  instantToWallTime,
  isValidTimeZone,
  parseWallTime,
  wallTimeToInstant,
} from './zoned-time.ts';

describe('zoned time', () => {
  it('converts wall time in a fixed-offset zone', () => {
    assert.equal(
      wallTimeToInstant('2026-10-12 09:00', 'Africa/Douala'),
      '2026-10-12T08:00:00.000Z',
    );
    assert.equal(
      instantToWallTime('2026-10-12T08:00:00.000Z', 'Africa/Douala'),
      '2026-10-12 09:00',
    );
  });

  it('handles daylight saving on both sides of the change', () => {
    assert.equal(
      wallTimeToInstant('2026-07-01 09:00', 'Europe/Paris'),
      '2026-07-01T07:00:00.000Z',
    );
    assert.equal(
      wallTimeToInstant('2026-12-01 09:00', 'Europe/Paris'),
      '2026-12-01T08:00:00.000Z',
    );
  });

  it('rejects impossible dates and unknown zones', () => {
    assert.equal(parseWallTime('2026-02-29 10:00'), null);
    assert.ok(parseWallTime('2028-02-29 10:00'));
    assert.equal(wallTimeToInstant('2026-10-12 09:00', 'Mars/Base'), null);
    assert.equal(isValidTimeZone(''), false);
    assert.equal(instantToWallTime('not a date', 'UTC'), '');
  });
});
