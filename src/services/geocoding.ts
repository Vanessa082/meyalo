/**
 * Venue search for the curator console.
 *
 * The console depends only on the `Geocoder` interface. Today the provider is
 * Nominatim (OpenStreetMap); a paid provider such as Google can replace it by
 * adding another implementation and choosing it in geocoder.service.ts. A
 * provider with a secret key must run behind a server proxy, never in the app.
 *
 * Nominatim's public usage policy applies to that implementation:
 * https://operations.osmfoundation.org/policies/nominatim/
 * - at most one request per second, enforced here as well;
 * - searches are explicit (a button), never search-as-you-type;
 * - results are cached so a repeated search never re-queries;
 * - OpenStreetMap attribution is shown wherever results appear;
 * - it can be switched off with EXPO_PUBLIC_GEOCODER_URL=off.
 * Only venue names and public addresses are sent, never personal data.
 */

export interface Place {
  label: string;
  latitude: number;
  longitude: number;
}

/** What every geocoding provider must offer. */
export interface Geocoder {
  /** Places in the configured countries matching a venue or address, best first. */
  search(query: string, language: string): Promise<Place[]>;
}

export type GeocodingErrorKind =
  | 'disabled'
  | 'empty_query'
  | 'too_fast'
  | 'unavailable';

export function isGeocodingError(error: unknown): error is GeocodingError {
  return error instanceof GeocodingError;
}

export class GeocodingError extends Error {
  readonly kind: GeocodingErrorKind;

  constructor(kind: GeocodingErrorKind, message: string) {
    super(message);
    this.name = 'GeocodingError';
    this.kind = kind;
  }
}

interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface NominatimOptions {
  /** Null when the geocoder is switched off. */
  baseUrl: string | null;
  /** ISO 3166-1 alpha-2 codes to search in, lowercase. */
  countryCodes: readonly string[];
  fetch: (url: string) => Promise<FetchResponse>;
  now?: () => number;
}

const MIN_INTERVAL_MS = 1000;
const MAX_RESULTS = 5;

function toPlace(raw: unknown): Place | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (
    typeof item.display_name !== 'string' ||
    typeof item.lat !== 'string' ||
    typeof item.lon !== 'string' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { label: item.display_name, latitude, longitude };
}

export function createNominatimGeocoder({
  baseUrl,
  countryCodes,
  fetch,
  now = Date.now,
}: NominatimOptions): Geocoder {
  const cache = new Map<string, Place[]>();
  let lastRequestAt = Number.NEGATIVE_INFINITY;

  return {
    async search(query: string, language: string): Promise<Place[]> {
      if (!baseUrl) {
        throw new GeocodingError('disabled', 'Venue search is switched off.');
      }
      const q = query.trim().replace(/\s+/g, ' ');
      if (!q) {
        throw new GeocodingError('empty_query', 'Type a venue or address.');
      }
      const cacheKey = `${language}:${q.toLowerCase()}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      if (now() - lastRequestAt < MIN_INTERVAL_MS) {
        throw new GeocodingError(
          'too_fast',
          'Wait a second before searching again.',
        );
      }
      lastRequestAt = now();

      const url = new URL('/search', baseUrl);
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('countrycodes', countryCodes.join(','));
      url.searchParams.set('limit', String(MAX_RESULTS));
      url.searchParams.set('accept-language', language);

      let body: unknown;
      try {
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        body = await response.json();
      } catch {
        throw new GeocodingError(
          'unavailable',
          'Venue search is unavailable right now.',
        );
      }
      const places = Array.isArray(body)
        ? body.map(toPlace).filter((place): place is Place => place !== null)
        : [];
      cache.set(cacheKey, places);
      return places;
    },
  };
}
