/**
 * HeroMapCard
 *
 * Wraps the platform-split MapCanvas:
 *   - map-canvas.tsx         → Expo Go / web styled canvas (no native deps)
 *   - map-canvas.native.tsx  → real react-native-maps (dev/prod build only)
 */
import { Compass, Maximize2, RefreshCw } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Card } from './card';
import { MapCanvas } from './map-canvas';
import { ThemeText } from './theme-text';

interface HeroMapCardProps {
  opportunityCount?: number;
  city?: string;
  onExploreMap?: () => void;
  onRefresh?: () => void;
}

// Seed pins — will be replaced with real event coordinates from the service layer
const SAMPLE_PINS = [
  { id: '1', title: 'Bastos', count: 3, latitude: 3.865, longitude: 11.515 },
  { id: '2', title: 'Mendong', count: 2, latitude: 3.832, longitude: 11.485 },
  { id: '3', title: 'Mvog Ada', count: 7, latitude: 3.855, longitude: 11.528 },
  { id: '4', title: 'Nlongkak', count: 4, latitude: 3.872, longitude: 11.508 },
  { id: '5', title: 'Omnisport', count: 5, latitude: 3.868, longitude: 11.535 },
];

export function HeroMapCard({
  opportunityCount = 12,
  city = 'Yaoundé',
  onExploreMap,
  onRefresh,
}: HeroMapCardProps) {
  const colors = useTheme();

  return (
    <Card
      variant="outlined"
      padding="none"
      style={[
        styles.cardContainer,
        { backgroundColor: colors.primarySoft, borderColor: colors.border },
      ]}
    >
      {/* ─── Map viewport ─── */}
      <View style={styles.mapArea}>
        {/* Platform-split: Expo Go picks map-canvas.tsx, builds pick map-canvas.native.tsx */}
        <MapCanvas pins={SAMPLE_PINS} />

        {/* User location pulse — layered above the map */}
        <View pointerEvents="none" style={styles.userPulseOuter}>
          <View
            style={[styles.userPulseInner, { borderColor: colors.surface }]}
          />
        </View>

        {/* Explore map button — always on top */}
        <Pressable
          style={[styles.exploreButton, { backgroundColor: colors.text }]}
          onPress={onExploreMap}
        >
          <Maximize2 size={13} color={colors.textInverse} />
          <ThemeText
            variant="caption"
            style={[styles.exploreButtonText, { color: colors.textInverse }]}
          >
            Explore map
          </ThemeText>
        </Pressable>
      </View>

      {/* ─── Info bar ─── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
        <View style={styles.statusInfo}>
          <View
            style={[
              styles.compassIconBg,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Compass size={20} color={colors.primary} />
          </View>
          <View>
            <ThemeText variant="title" style={styles.oppCountText}>
              {opportunityCount} opportunities near {city}
            </ThemeText>
            <ThemeText variant="caption" themeColor="textMuted">
              Updated 1 hour ago
            </ThemeText>
          </View>
        </View>

        <Pressable
          style={[styles.refreshButton, { borderColor: colors.border }]}
          onPress={onRefresh}
        >
          <RefreshCw size={13} color={colors.textSecondary} />
          <ThemeText variant="caption" style={{ color: colors.textSecondary }}>
            Refresh
          </ThemeText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 20,
  },
  mapArea: {
    height: 170,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exploreButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  exploreButtonText: {
    fontSize: 12,
  },
  userPulseOuter: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(8, 127, 115, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  userPulseInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#087F73',
    borderWidth: 3,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    margin: 8,
    borderRadius: 14,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compassIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oppCountText: {
    fontSize: 13,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
