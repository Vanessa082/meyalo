import { publicEnv } from '@/config/env';
import { REGION } from '@/config/region';
import { createNominatimGeocoder, type Geocoder } from './geocoding';

/**
 * The one place that chooses the geocoding provider. To move to Google later:
 * add a Google implementation of `Geocoder` that calls a server proxy (an Edge
 * Function holding the key), then select it here. Nothing else changes.
 */
export const geocoder: Geocoder = createNominatimGeocoder({
  baseUrl: publicEnv.geocoderUrl,
  countryCodes: REGION.countryCodes,
  fetch: (url) => fetch(url, { headers: { Accept: 'application/json' } }),
});

export const geocoderAttribution = {
  label: '© OpenStreetMap contributors',
  url: 'https://www.openstreetmap.org/copyright',
};
