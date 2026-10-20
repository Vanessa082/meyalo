import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { formatEventDate } from '@/services/event-mapping';
import { Radius } from '@/theme';
import type { EventMapProps } from './event-map.types';

/** Whole-city view when no radius is chosen, in km. */
const CITY_SPAN_KM = 16;
const KM_PER_DEGREE = 111;

/**
 * Real pins for real events only. The provider follows app configuration:
 * Google Maps when EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is set (app.config.ts),
 * otherwise the platform default (Apple Maps on iOS).
 */
export function EventMap({
  center,
  radiusKm,
  events,
  onOpenEvent,
  height = 360,
}: EventMapProps) {
  const colors = useTheme();
  const i18n = useTranslation();
  const spanKm = (radiusKm ?? CITY_SPAN_KM / 2) * 2.4;
  const delta = spanKm / KM_PER_DEGREE;

  return (
    <View style={[styles.frame, { height, borderColor: colors.border }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        toolbarEnabled={false}
      >
        {events.map((event) =>
          event.latitude == null || event.longitude == null ? null : (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              title={event.title}
              description={formatEventDate(
                event.startsAt,
                event.timezone || null,
                i18n,
              )}
              pinColor={colors.brandMark}
              onCalloutPress={() => onOpenEvent(event.id)}
            />
          ),
        )}
      </MapView>
    </View>
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
