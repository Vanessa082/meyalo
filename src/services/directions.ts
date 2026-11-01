import type { EventCardData } from '../types/event.type.ts';

export type MapsPlatform = 'ios' | 'android' | 'web';

type Place = Pick<
  EventCardData,
  'format' | 'venueName' | 'address' | 'city' | 'latitude' | 'longitude'
>;

/**
 * A link that opens the phone's maps app with the venue as destination, or
 * null when there is nowhere precise to go: online events, or only a city.
 * Coordinates win over the address.
 */
export function directionsUrl(
  place: Place,
  platform: MapsPlatform,
): string | null {
  if (place.format === 'virtual') return null;

  if (place.latitude != null && place.longitude != null) {
    const point = `${place.latitude},${place.longitude}`;
    const label = place.venueName ? encodeURIComponent(place.venueName) : null;
    switch (platform) {
      case 'ios':
        return `https://maps.apple.com/?daddr=${point}${label ? `&q=${label}` : ''}`;
      case 'android':
        return `geo:${point}?q=${point}${label ? `(${label})` : ''}`;
      case 'web':
        return `https://www.google.com/maps/dir/?api=1&destination=${point}`;
    }
  }

  if (!place.address?.trim()) return null;
  const query = encodeURIComponent(
    [place.venueName, place.address, place.city]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(', '),
  );
  switch (platform) {
    case 'ios':
      return `https://maps.apple.com/?daddr=${query}`;
    case 'android':
      return `geo:0,0?q=${query}`;
    case 'web':
      return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  }
}
