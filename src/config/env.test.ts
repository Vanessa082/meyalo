import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { joinPublicUrl, normalizeBaseUrl } from './env.ts';

describe('public base URL', () => {
  it('returns null when no base URL is configured', () => {
    assert.equal(joinPublicUrl(undefined, '/event/1'), null);
  });

  it('joins a configured origin with a path and does not invent a host', () => {
    assert.equal(
      joinPublicUrl('https://meyalo.example', 'event/abc'),
      'https://meyalo.example/event/abc',
    );
    assert.equal(
      joinPublicUrl('https://meyalo.example/', '/event/abc'),
      'https://meyalo.example/event/abc',
    );
  });

  it('accepts http and https origins and rejects anything else', () => {
    assert.equal(normalizeBaseUrl(undefined), undefined);
    assert.equal(normalizeBaseUrl('  '), undefined);
    assert.equal(
      normalizeBaseUrl('https://preview.expo.app/extra'),
      'https://preview.expo.app',
    );
    assert.throws(() => normalizeBaseUrl('not a url'));
    assert.throws(() => normalizeBaseUrl('meyalo://event/1'));
  });
});
