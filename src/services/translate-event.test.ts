import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  type CacheRow,
  contentHash,
  createGoogleTranslator,
  handleTranslate,
  parseRequest,
  type TranslateDeps,
} from '../../supabase/functions/translate-event/translate.ts';

const ID = '1f6c6fa9-ce6f-4848-bc92-13723ff49dca';

describe('parseRequest', () => {
  it('accepts an event id and en or fr', () => {
    assert.deepEqual(parseRequest({ eventId: ID, target: 'fr' }), {
      eventId: ID,
      target: 'fr',
    });
  });

  it('rejects anything else, including text to translate', () => {
    assert.equal(parseRequest({ eventId: 'x', target: 'fr' }), null);
    assert.equal(parseRequest({ eventId: ID, target: 'de' }), null);
    assert.equal(parseRequest(null), null);
    assert.equal(parseRequest('hello'), null);
  });
});

describe('contentHash', () => {
  it('is a stable SHA-256 that changes with the text', async () => {
    const a = await contentHash('Bienvenue');
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.equal(a, await contentHash('Bienvenue'));
    assert.notEqual(a, await contentHash('Bienvenue!'));
  });
});

function deps(overrides: Partial<TranslateDeps> = {}) {
  const writes: CacheRow[] = [];
  const calls: { texts: string[]; target: string }[] = [];
  const base: TranslateDeps = {
    loadEvent: async () => ({ title: 'Atelier', description: 'Bienvenue' }),
    readCache: async () => ({}),
    writeCache: async (rows) => {
      writes.push(...rows);
    },
    translator: {
      provider: 'test',
      translate: async (texts, target) => {
        calls.push({ texts, target });
        return texts.map((text) => `[${target}] ${text}`);
      },
    },
    ...overrides,
  };
  return { base, writes, calls };
}

describe('handleTranslate', () => {
  it('translates the stored text and caches one row per field', async () => {
    const { base, writes, calls } = deps();
    const result = await handleTranslate(base, { eventId: ID, target: 'en' });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      title: '[en] Atelier',
      description: '[en] Bienvenue',
    });
    assert.equal(calls.length, 1);
    assert.deepEqual(
      writes.map((row) => [row.field, row.locale, row.content]),
      [
        ['title', 'en', '[en] Atelier'],
        ['description', 'en', '[en] Bienvenue'],
      ],
    );
    assert.equal(writes[0].contentHash, await contentHash('Atelier'));
  });

  it('answers from the cache without calling the provider', async () => {
    const { base, calls } = deps({
      readCache: async () => ({ title: 'Workshop', description: 'Welcome' }),
    });
    const result = await handleTranslate(base, { eventId: ID, target: 'en' });
    assert.deepEqual(result.body, {
      title: 'Workshop',
      description: 'Welcome',
    });
    assert.equal(calls.length, 0);
  });

  it('translates only the field whose text changed', async () => {
    const { base, calls } = deps({
      readCache: async () => ({ title: 'Workshop' }),
    });
    const result = await handleTranslate(base, { eventId: ID, target: 'en' });
    assert.deepEqual(calls, [{ texts: ['Bienvenue'], target: 'en' }]);
    assert.deepEqual(result.body, {
      title: 'Workshop',
      description: '[en] Bienvenue',
    });
  });

  it('asks the cache by the hash of the current text', async () => {
    let asked: unknown = null;
    const { base } = deps({
      readCache: async (_id, _locale, hashes) => {
        asked = hashes;
        return {};
      },
    });
    await handleTranslate(base, { eventId: ID, target: 'en' });
    assert.deepEqual(asked, {
      title: await contentHash('Atelier'),
      description: await contentHash('Bienvenue'),
    });
  });

  it('does not send an empty description to the provider', async () => {
    const { base, calls } = deps({
      loadEvent: async () => ({ title: 'Atelier', description: '  ' }),
    });
    const result = await handleTranslate(base, { eventId: ID, target: 'en' });
    assert.deepEqual(calls, [{ texts: ['Atelier'], target: 'en' }]);
    assert.equal((result.body as { description: string }).description, '');
  });

  it('is 404 for an event that is not published', async () => {
    const { base, calls } = deps({ loadEvent: async () => null });
    const result = await handleTranslate(base, { eventId: ID, target: 'en' });
    assert.equal(result.status, 404);
    assert.equal(calls.length, 0);
  });

  it('is 503 not_configured without a provider, unless cached', async () => {
    const { base } = deps({ translator: null });
    const result = await handleTranslate(base, { eventId: ID, target: 'en' });
    assert.equal(result.status, 503);
    assert.deepEqual(result.body, { error: 'not_configured' });

    const cached = deps({
      translator: null,
      readCache: async () => ({ title: 'Workshop', description: 'Welcome' }),
    });
    const hit = await handleTranslate(cached.base, {
      eventId: ID,
      target: 'en',
    });
    assert.equal(hit.status, 200);
  });

  it('is 502 when the provider fails, and caches nothing', async () => {
    const { base, writes } = deps({
      translator: {
        provider: 'test',
        translate: async () => {
          throw new Error('quota');
        },
      },
    });
    const result = await handleTranslate(base, { eventId: ID, target: 'en' });
    assert.equal(result.status, 502);
    assert.equal(writes.length, 0);
  });
});

describe('createGoogleTranslator', () => {
  it('sends the key in a header, never in the URL, and reads the answer', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const translator = createGoogleTranslator({
      apiKey: 'test-key',
      fetch: async (url, init) => {
        seen = { url: String(url), init: init ?? {} };
        return new Response(
          JSON.stringify({
            data: {
              translations: [
                { translatedText: 'Workshop' },
                { translatedText: 'Welcome' },
              ],
            },
          }),
          { status: 200 },
        );
      },
    });
    const texts = await translator.translate(['Atelier', 'Bienvenue'], 'en');
    assert.deepEqual(texts, ['Workshop', 'Welcome']);
    assert.ok(seen);
    const { url, init } = seen as { url: string; init: RequestInit };
    assert.doesNotMatch(url, /test-key/);
    assert.equal(
      (init.headers as Record<string, string>)['x-goog-api-key'],
      'test-key',
    );
    assert.deepEqual(JSON.parse(String(init.body)), {
      q: ['Atelier', 'Bienvenue'],
      target: 'en',
      format: 'text',
    });
  });

  it('fails on an error status or a malformed answer', async () => {
    const failing = createGoogleTranslator({
      apiKey: 'k',
      fetch: async () => new Response('{}', { status: 403 }),
    });
    await assert.rejects(failing.translate(['a'], 'en'));
    const malformed = createGoogleTranslator({
      apiKey: 'k',
      fetch: async () =>
        new Response(JSON.stringify({ data: { translations: [] } }), {
          status: 200,
        }),
    });
    await assert.rejects(malformed.translate(['a'], 'en'));
  });
});
