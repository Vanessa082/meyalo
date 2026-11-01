import { CITY_CENTERS, type LatLng } from '../config/discovery/cities.ts';
import type { LocalDiscoveryProfile } from '../types/discovery-profile.ts';
import type { EventCardData } from '../types/event.type.ts';
import { distanceKm, samePlace } from './geo.ts';
import { isUpcoming } from './ranking.service.ts';

/**
 * Around You (docs/product-decisions.md, Feature 9): in-person and hybrid
 * events in the user's city, nearest first. Distances are straight-line from
 * the city centre until "Use my location" exists, and are labelled approximate.
 * Nothing is invented: events without coordinates are listed apart.
 */

/** Null means the whole city. */
export type RadiusKm = 2 | 5 | 10 | null;

export type AroundYou =
  | { kind: 'needs_city' }
  | { kind: 'online_only' }
  | {
      kind: 'city';
      cityName: string;
      /** False when the city has no known centre: no distances, date order. */
      measured: boolean;
      /** The city centre distances are measured from, when known. */
      center: LatLng | null;
      /** Located events within the radius, nearest first, with `distanceKm`. */
      pinned: EventCardData[];
      /** Events in the city without coordinates, soonest first. */
      unpinned: EventCardData[];
    };

export function buildAroundYou(
  events: readonly EventCardData[],
  profile: LocalDiscoveryProfile | null,
  radiusKm: RadiusKm,
  now: Date = new Date(),
): AroundYou {
  const area = profile?.area ?? null;
  if (!area) return { kind: 'needs_city' };
  if (area.kind === 'online_only') return { kind: 'online_only' };

  const center = CITY_CENTERS[area.city.id];
  const inCity = events
    .filter((event) => isUpcoming(event, now))
    .filter((event) => event.format !== 'virtual')
    .filter((event) => event.city && samePlace(event.city, area.city.name))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  const pinned: EventCardData[] = [];
  const unpinned: EventCardData[] = [];
  for (const event of inCity) {
    if (!center || event.latitude == null || event.longitude == null) {
      unpinned.push(event);
      continue;
    }
    const km = distanceKm(center, {
      lat: event.latitude,
      lng: event.longitude,
    });
    if (radiusKm === null || km <= radiusKm) {
      pinned.push({ ...event, distanceKm: km });
    }
  }
  pinned.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  return {
    kind: 'city',
    cityName: area.city.name,
    measured: Boolean(center),
    center: center ?? null,
    pinned,
    unpinned,
  };
}
