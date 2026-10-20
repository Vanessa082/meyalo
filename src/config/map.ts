/**
 * Web map tiles (the phone apps use react-native-maps). OpenFreeMap: free, no
 * key, OpenStreetMap data, attribution shown on the map. To change provider,
 * point these at another MapLibre style; the component does not change.
 * https://openfreemap.org
 */
export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;
