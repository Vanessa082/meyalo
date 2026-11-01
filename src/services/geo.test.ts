import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CITY_CENTERS } from '../config/discovery/cities.ts';
import { distanceKm, samePlace, zoomForSpan } from './geo.ts';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    assert.equal(distanceKm(CITY_CENTERS.buea, CITY_CENTERS.buea), 0);
  });

  it('puts Douala closer to Buea than Yaoundé is', () => {
    const toDouala = distanceKm(CITY_CENTERS.buea, CITY_CENTERS.douala);
    const toYaounde = distanceKm(CITY_CENTERS.buea, CITY_CENTERS.yaounde);
    assert.ok(toDouala > 40 && toDouala < 70, `${toDouala}`);
    assert.ok(toYaounde > toDouala);
  });
});

describe('samePlace', () => {
  it('ignores accents, case and spaces', () => {
    assert.ok(samePlace('Yaoundé', ' yaounde '));
    assert.ok(!samePlace('Buea', 'Yaoundé'));
  });
});

describe('zoomForSpan', () => {
  it('shows about the requested width across the map', () => {
    // At the equator, zoom 12 is ~19 m per pixel; 360 px is ~6.9 km.
    const zoom = zoomForSpan(6.88, 0, 360);
    assert.ok(Math.abs(zoom - 12) < 0.05, String(zoom));
  });

  it('zooms in for a smaller area and out for a larger one', () => {
    assert.ok(zoomForSpan(1, 4, 360) > zoomForSpan(10, 4, 360));
  });

  it('stays within the map limits', () => {
    assert.equal(zoomForSpan(0.0001, 4, 360), 17);
    assert.equal(zoomForSpan(100000, 4, 360), 3);
  });
});
