import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MAP_STYLES } from '@/config/map';
import { useTheme } from '@/hooks/use-theme';
import { zoomForSpan } from '@/services/geo';
import { Radius } from '@/theme';
import { Palette } from '@/theme/colors';
import type { EventMapProps } from './event-map.types';

/** Whole-city view when no radius is chosen, in km. */
const CITY_SPAN_KM = 16;

/**
 * Web map: MapLibre with OpenStreetMap tiles (config/map.ts). The library is
 * loaded only when a map is shown, so it costs nothing on first load. Real
 * pins for real events only, in the brand colours; a pin opens its event.
 */
export function EventMap({
  center,
  radiusKm,
  events,
  onOpenEvent,
  height = 360,
}: EventMapProps) {
  const colors = useTheme();
  const container = useRef<View>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const open = useRef(onOpenEvent);
  open.current = onOpenEvent;
  // The first view; later changes go through jumpTo below.
  const initialCenter = useRef(center);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    import('maplibre-gl').then(({ Map: MapLibre }) => {
      const element = container.current as unknown as HTMLElement | null;
      if (cancelled || !element) return;
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const start = initialCenter.current;
      map.current = new MapLibre({
        container: element,
        style: dark ? MAP_STYLES.dark : MAP_STYLES.light,
        center: [start.lng, start.lat],
        zoom: 12,
        attributionControl: { compact: true },
        cooperativeGestures: true,
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Follow the centre and the chosen distance.
  useEffect(() => {
    const element = container.current as unknown as HTMLElement | null;
    if (!ready || !map.current || !element) return;
    const spanKm = (radiusKm ?? CITY_SPAN_KM / 2) * 2.4;
    map.current.jumpTo({
      center: [center.lng, center.lat],
      zoom: zoomForSpan(spanKm, center.lat, element.clientWidth || 360),
    });
  }, [ready, center.lat, center.lng, radiusKm]);

  // Pins.
  const pins = events
    .filter((event) => event.latitude != null && event.longitude != null)
    .map((event) => ({
      id: event.id,
      title: event.title,
      lng: event.longitude as number,
      lat: event.latitude as number,
    }));
  const pinKey = JSON.stringify(pins);
  useEffect(() => {
    if (!ready || !map.current) return;
    let markers: Marker[] = [];
    let cancelled = false;
    import('maplibre-gl').then(({ Marker }) => {
      if (cancelled || !map.current) return;
      markers = (JSON.parse(pinKey) as typeof pins).map((pin) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.title = pin.title;
        button.setAttribute('aria-label', pin.title);
        Object.assign(button.style, {
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: Palette.brandBright,
          border: `3px solid ${Palette.ink}`,
          cursor: 'pointer',
          padding: '0',
        });
        button.addEventListener('click', () => open.current(pin.id));
        return new Marker({ element: button })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map.current as MapLibreMap);
      });
    });
    return () => {
      cancelled = true;
      for (const marker of markers) marker.remove();
    };
  }, [ready, pinKey]);

  return (
    <View
      ref={container}
      style={[styles.frame, { height, borderColor: colors.border }]}
    />
  );
}

export const EVENT_MAP_SUPPORTED = true;

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
