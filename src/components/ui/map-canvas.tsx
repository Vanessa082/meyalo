/**
 * map-canvas.tsx — Web & Expo Go fallback
 *
 * Metro resolves platform extensions in priority order:
 *   .native.tsx → .tsx
 *
 * When running in Expo Go (which cannot bundle react-native-maps codegen specs),
 * or on the web, Metro picks THIS file and renders the styled canvas placeholder.
 * When running in a proper dev/prod build the .native.tsx variant is chosen instead.
 */
import { StyleSheet, View } from 'react-native';
import { ThemeText } from '@/components/ui/theme-text';

interface MapCanvasProps {
  pins: Array<{ id: string; count: number }>;
  children?: React.ReactNode;
}

// Positioned slots for pins — matches the neighbourhood layout visually.
const PIN_POSITIONS = [
  { top: 24, left: 56 },
  { top: 18, left: 180 },
  { top: 28, right: 60 },
  { bottom: 36, left: 110 },
  { bottom: 30, right: 90 },
] as const;

const NEIGHBOURHOOD_LABELS = [
  { label: 'Bastos', top: 30, left: 104 },
  { label: 'Mendong', top: 60, left: 130 },
  { label: 'Mvog Ada', top: 40, right: 100 },
  { label: 'Nlongkak', bottom: 20, left: 40 },
] as const;

export function MapCanvas({ pins }: MapCanvasProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Teal-tinted map canvas background already set by parent */}

      {/* Neighbourhood text labels */}
      {NEIGHBOURHOOD_LABELS.map(({ label, ...pos }) => (
        <ThemeText key={label} variant="caption" style={[styles.label, pos]}>
          {label}
        </ThemeText>
      ))}

      {/* Opportunity count pins */}
      {pins.slice(0, PIN_POSITIONS.length).map((pin, i) => (
        <View key={pin.id} style={[styles.pinBadge, PIN_POSITIONS[i]]}>
          <ThemeText variant="captionBold" style={styles.pinText}>
            {pin.count}
          </ThemeText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pinBadge: {
    position: 'absolute',
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
  label: {
    position: 'absolute',
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
    opacity: 0.8,
  },
});
