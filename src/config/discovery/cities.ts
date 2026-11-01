export interface City {
  id: string;
  name: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * City centres, used to measure approximate straight-line distance. Source:
 * Wikipedia primary coordinates (fetched 2026-10-18). Kept apart from `City`
 * so the stored discovery profile shape does not change. Cities without an
 * entry are sorted by date instead of distance.
 */
export const CITY_CENTERS: Readonly<Record<string, LatLng>> = {
  yaounde: { lat: 3.8667, lng: 11.5167 },
  douala: { lat: 4.05, lng: 9.7 },
  buea: { lat: 4.1667, lng: 9.2333 },
  bamenda: { lat: 5.9614, lng: 10.1517 },
};

/** Launch cities, offered as one-tap choices. */
export const QUICK_PICK_CITIES: readonly City[] = [
  { id: 'yaounde', name: 'Yaoundé' },
  { id: 'douala', name: 'Douala' },
  { id: 'buea', name: 'Buea' },
  { id: 'bamenda', name: 'Bamenda' },
];

/** Other Cameroonian cities, reachable through search. */
export const OTHER_CITIES: readonly City[] = [
  { id: 'abong_mbang', name: 'Abong-Mbang' },
  { id: 'bafang', name: 'Bafang' },
  { id: 'bafia', name: 'Bafia' },
  { id: 'bafoussam', name: 'Bafoussam' },
  { id: 'bangangte', name: 'Bangangté' },
  { id: 'batouri', name: 'Batouri' },
  { id: 'bertoua', name: 'Bertoua' },
  { id: 'dschang', name: 'Dschang' },
  { id: 'ebolowa', name: 'Ebolowa' },
  { id: 'edea', name: 'Edéa' },
  { id: 'foumban', name: 'Foumban' },
  { id: 'garoua', name: 'Garoua' },
  { id: 'guider', name: 'Guider' },
  { id: 'kousseri', name: 'Kousséri' },
  { id: 'kribi', name: 'Kribi' },
  { id: 'kumba', name: 'Kumba' },
  { id: 'kumbo', name: 'Kumbo' },
  { id: 'limbe', name: 'Limbe' },
  { id: 'loum', name: 'Loum' },
  { id: 'mamfe', name: 'Mamfe' },
  { id: 'maroua', name: 'Maroua' },
  { id: 'mbalmayo', name: 'Mbalmayo' },
  { id: 'mbouda', name: 'Mbouda' },
  { id: 'meiganga', name: 'Meiganga' },
  { id: 'mokolo', name: 'Mokolo' },
  { id: 'ngaoundere', name: 'Ngaoundéré' },
  { id: 'nkambe', name: 'Nkambé' },
  { id: 'nkongsamba', name: 'Nkongsamba' },
  { id: 'obala', name: 'Obala' },
  { id: 'sangmelima', name: 'Sangmélima' },
  { id: 'tibati', name: 'Tibati' },
  { id: 'tiko', name: 'Tiko' },
  { id: 'wum', name: 'Wum' },
  { id: 'yagoua', name: 'Yagoua' },
];

export const ALL_CITIES: readonly City[] = [
  ...QUICK_PICK_CITIES,
  ...OTHER_CITIES,
];

export function findCity(id: string): City | null {
  return ALL_CITIES.find((city) => city.id === id) ?? null;
}

export function isQuickPickCity(id: string): boolean {
  return QUICK_PICK_CITIES.some((city) => city.id === id);
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Accent- and case-insensitive city search. Names starting with the query
 * come before names that only contain it.
 */
export function searchCities(
  query: string,
  cities: readonly City[] = ALL_CITIES,
): City[] {
  const q = fold(query);
  if (!q) return [];
  const starts: City[] = [];
  const contains: City[] = [];
  for (const city of cities) {
    const name = fold(city.name);
    if (name.startsWith(q)) starts.push(city);
    else if (name.includes(q)) contains.push(city);
  }
  return [...starts, ...contains];
}
