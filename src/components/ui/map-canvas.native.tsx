/**
 * map-canvas.native.tsx — Native dev/prod build variant
 *
 * Metro resolves `.native.tsx` over `.tsx` on Android & iOS,
 * so this file is ONLY bundled in a proper native build (expo run:android / run:ios
 * or EAS Build). Expo Go will never pick this up, so the codegen specs inside
 * react-native-maps are never touched during Go development.
 */
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { ThemeText } from '@/components/ui/theme-text';

interface MapCanvasProps {
  pins: Array<{
    id: string;
    count: number;
    latitude: number;
    longitude: number;
  }>;
}

const YAOUNDE_REGION = {
  latitude: 3.848,
  longitude: 11.5021,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export function MapCanvas({ pins }: MapCanvasProps) {
  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      initialRegion={YAOUNDE_REGION}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
        >
          <View style={styles.pinBadge}>
            <ThemeText variant="captionBold" style={styles.pinText}>
              {pin.count}
            </ThemeText>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pinBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#087F73',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pinText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});
