/**
 * The launch region. Everything that depends on where Meyalo operates reads
 * it from here, so expanding to another country is a configuration change.
 * Launch cities and their centres live in config/discovery/cities.ts.
 */
export const REGION = {
  name: 'Cameroon',
  /** ISO 3166-1 alpha-2, lowercase, for geocoding. */
  countryCodes: ['cm'],
  /** Default timezone for dates shown without an event of their own. */
  timeZone: 'Africa/Douala',
} as const;
