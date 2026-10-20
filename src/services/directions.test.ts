import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { directionsUrl } from './directions.ts';

const located = {
  format: 'in_person' as const,
  venueName: 'Community Hall',
  address: 'Rue 12, Nkwen',
  city: 'Bamenda',
  latitude: 5.9631,
  longitude: 10.1591,
};

describe('directionsUrl', () => {
  it('uses coordinates when they exist', () => {
    assert.equal(
      directionsUrl(located, 'ios'),
      'https://maps.apple.com/?daddr=5.9631,10.1591&q=Community%20Hall',
    );
    assert.equal(
      directionsUrl(located, 'android'),
      'geo:5.9631,10.1591?q=5.9631,10.1591(Community%20Hall)',
    );
    assert.equal(
      directionsUrl(located, 'web'),
      'https://www.google.com/maps/dir/?api=1&destination=5.9631,10.1591',
    );
  });

  it('falls back to the street address', () => {
    const address = { ...located, latitude: undefined, longitude: undefined };
    const query = 'Community%20Hall%2C%20Rue%2012%2C%20Nkwen%2C%20Bamenda';
    assert.equal(
      directionsUrl(address, 'ios'),
      `https://maps.apple.com/?daddr=${query}`,
    );
    assert.equal(directionsUrl(address, 'android'), `geo:0,0?q=${query}`);
    assert.equal(
      directionsUrl(address, 'web'),
      `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    );
  });

  it('works for hybrid events', () => {
    assert.ok(directionsUrl({ ...located, format: 'hybrid' }, 'web'));
  });

  it('offers nothing for online events or a city alone', () => {
    assert.equal(directionsUrl({ ...located, format: 'virtual' }, 'web'), null);
    assert.equal(
      directionsUrl(
        {
          format: 'in_person',
          venueName: 'Community Hall',
          city: 'Bamenda',
        },
        'web',
      ),
      null,
    );
  });
});
