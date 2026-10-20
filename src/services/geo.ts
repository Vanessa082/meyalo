import type { LatLng } from '../config/discovery/cities.ts';

const EARTH_RADIUS_KM = 6371;

/** Straight-line (great-circle) distance in kilometres. Approximate by design:
 *  travel distance comes from the phone's maps app. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** "Yaoundé", " yaounde " and "YAOUNDÉ" compare equal. */
export function samePlace(a: string, b: string): boolean {
  return normalizePlace(a) === normalizePlace(b);
}

function normalizePlace(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Metres per pixel at zoom 0 on the equator, for 512 px map tiles. */
const METRES_PER_PIXEL_Z0 = 78271.517;
const MIN_ZOOM = 3;
const MAX_ZOOM = 17;

/** The map zoom that shows about `spanKm` across `widthPx` at `latitude`. */
export function zoomForSpan(
  spanKm: number,
  latitude: number,
  widthPx: number,
): number {
  const metresPerPixel = (spanKm * 1000) / widthPx;
  const zoom = Math.log2(
    (METRES_PER_PIXEL_Z0 * Math.cos((latitude * Math.PI) / 180)) /
      metresPerPixel,
  );
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}
