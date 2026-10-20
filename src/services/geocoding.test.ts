import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createNominatimGeocoder, GeocodingError } from './geocoding.ts';

const BASE = 'https://nominatim.openstreetmap.org';

/** A fake fetch that records URLs and answers with the given body. */
function fakeFetch(body: unknown, status = 200) {
  const urls: string[] = [];
  const fetch = async (url: string) => {
    urls.push(url);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
  return { fetch, urls };
}

const RESULT = [
  {
    display_name: 'ActivSpaces, Molyko, Buea, Fako, South-West, Cameroon',
    lat: '4.1503',
    lon: '9.2856',
  },
];

describe('geocoder', () => {
  it('searches Cameroon only, in the given language, five results', async () => {
    const { fetch, urls } = fakeFetch(RESULT);
    const geocoder = createNominatimGeocoder({
      baseUrl: BASE,
      countryCodes: ['cm'],
      fetch,
      now: () => 0,
    });
    await geocoder.search('ActivSpaces, Buea', 'fr');
    const url = new URL(urls[0] ?? '');
    assert.equal(url.origin + url.pathname, `${BASE}/search`);
    assert.equal(url.searchParams.get('q'), 'ActivSpaces, Buea');
    assert.equal(url.searchParams.get('countrycodes'), 'cm');
    assert.equal(url.searchParams.get('format'), 'jsonv2');
    assert.equal(url.searchParams.get('limit'), '5');
    assert.equal(url.searchParams.get('accept-language'), 'fr');
  });

  it('returns labelled places with numeric coordinates', async () => {
    const { fetch } = fakeFetch(RESULT);
    const geocoder = createNominatimGeocoder({
      baseUrl: BASE,
      countryCodes: ['cm'],
      fetch,
      now: () => 0,
    });
    assert.deepEqual(await geocoder.search('ActivSpaces', 'en'), [
      {
        label: 'ActivSpaces, Molyko, Buea, Fako, South-West, Cameroon',
        latitude: 4.1503,
        longitude: 9.2856,
      },
    ]);
  });

  it('drops malformed results instead of inventing coordinates', async () => {
    const { fetch } = fakeFetch([
      { display_name: 'No coords' },
      { display_name: 'Bad', lat: 'x', lon: '9' },
      { display_name: 'Out of range', lat: '95', lon: '9' },
      ...RESULT,
    ]);
    const geocoder = createNominatimGeocoder({
      baseUrl: BASE,
      countryCodes: ['cm'],
      fetch,
      now: () => 0,
    });
    const results = await geocoder.search('anything', 'en');
    assert.equal(results.length, 1);
  });

  it('answers a repeated search from cache without a second request', async () => {
    const { fetch, urls } = fakeFetch(RESULT);
    const geocoder = createNominatimGeocoder({
      baseUrl: BASE,
      countryCodes: ['cm'],
      fetch,
      now: () => 0,
    });
    await geocoder.search('ActivSpaces', 'en');
    await geocoder.search('  activspaces ', 'en');
    assert.equal(urls.length, 1);
  });

  it('refuses a second request within one second (usage policy)', async () => {
    let clock = 10_000;
    const { fetch } = fakeFetch(RESULT);
    const geocoder = createNominatimGeocoder({
      baseUrl: BASE,
      countryCodes: ['cm'],
      fetch,
      now: () => clock,
    });
    await geocoder.search('first', 'en');
    clock += 400;
    await assert.rejects(
      geocoder.search('second', 'en'),
      (error) => error instanceof GeocodingError && error.kind === 'too_fast',
    );
    clock += 700;
    await geocoder.search('second', 'en');
  });

  it('fails loudly on an empty query, a server error, or when switched off', async () => {
    const ok = createNominatimGeocoder({
      baseUrl: BASE,
      countryCodes: ['cm'],
      fetch: fakeFetch(RESULT).fetch,
      now: () => 0,
    });
    await assert.rejects(
      ok.search('  ', 'en'),
      (e) => e instanceof GeocodingError && e.kind === 'empty_query',
    );
    const down = createNominatimGeocoder({
      baseUrl: BASE,
      countryCodes: ['cm'],
      fetch: fakeFetch({}, 503).fetch,
      now: () => 0,
    });
    await assert.rejects(
      down.search('x', 'en'),
      (e) => e instanceof GeocodingError && e.kind === 'unavailable',
    );
    const off = createNominatimGeocoder({
      baseUrl: null,
      countryCodes: ['cm'],
      fetch: fakeFetch(RESULT).fetch,
      now: () => 0,
    });
    await assert.rejects(
      off.search('x', 'en'),
      (e) => e instanceof GeocodingError && e.kind === 'disabled',
    );
  });
});
