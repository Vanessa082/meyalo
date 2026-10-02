import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTrustLabel,
  mapFormat,
  sourceWasConfirmed,
} from './event-mapping.ts';

describe('mapFormat', () => {
  it('maps stored format values onto the app format', () => {
    assert.equal(mapFormat('physical'), 'in_person');
    assert.equal(mapFormat('in_person'), 'in_person');
    assert.equal(mapFormat('hybrid'), 'hybrid');
    assert.equal(mapFormat('online'), 'virtual');
  });
});

describe('sourceWasConfirmed', () => {
  it('follows verification_state and does not treat unreviewed as confirmed', () => {
    assert.equal(
      sourceWasConfirmed({ verification_state: 'source_confirmed' }),
      true,
    );
    assert.equal(
      sourceWasConfirmed({ verification_state: 'organizer_confirmed' }),
      true,
    );
    assert.equal(
      sourceWasConfirmed({
        verification_state: 'unreviewed',
        is_verified: true,
      }),
      false,
    );
    assert.equal(sourceWasConfirmed({ is_verified: true }), true);
    assert.equal(sourceWasConfirmed({}), false);
  });
});

describe('buildTrustLabel', () => {
  it('does not claim verification without a source', () => {
    assert.equal(
      buildTrustLabel(true, 'https://example.com'),
      'Official source',
    );
    assert.equal(
      buildTrustLabel(false, 'https://example.com'),
      'Source available',
    );
    assert.equal(buildTrustLabel(false, null), 'Community-submitted');
  });
});
