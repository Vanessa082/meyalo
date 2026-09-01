import { useRouter } from 'expo-router';
import {
  Building2,
  Globe,
  Layers,
  MapPin,
  Navigation,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';
import { DiscoveryProfileService } from '@/services/discovery-profile.service';
import type { EventFormatPreference } from '@/types/discovery-profile';

const CITIES = [
  {
    id: 'yaounde',
    name: 'Yaoundé',
    subtitle: 'Capital, Policy, Finance & Government Hub',
  },
  {
    id: 'douala',
    name: 'Douala',
    subtitle: 'Economic Capital, Trade, Logistics & Industry',
  },
  {
    id: 'buea',
    name: 'Buea',
    subtitle: 'Silicon Mountain, Tech Innovation & Startups',
  },
  {
    id: 'bamenda',
    name: 'Bamenda',
    subtitle: 'Education, Agriculture & Community Hub',
  },
  {
    id: 'other',
    name: 'Other City / Global',
    subtitle: 'Discover online & regional growth opportunities',
  },
];

const FORMAT_PREFERENCES: {
  id: string;
  label: string;
  badge?: string;
  formats: EventFormatPreference[];
  icon: typeof Layers;
}[] = [
  {
    id: 'both',
    label: 'Physical + Online',
    badge: 'Recommended',
    formats: ['in_person', 'virtual', 'hybrid'],
    icon: Layers,
  },
  {
    id: 'physical',
    label: 'Physical Only',
    formats: ['in_person', 'hybrid'],
    icon: Building2,
  },
  {
    id: 'virtual',
    label: 'Online Only',
    formats: ['virtual'],
    icon: Globe,
  },
];

export default function LocationOnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();

  const [selectedCityId, setSelectedCityId] = useState<string>('yaounde');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('both');

  const handleContinue = async () => {
    const cityObj = CITIES.find((c) => c.id === selectedCityId) ?? CITIES[0];
    const formatObj =
      FORMAT_PREFERENCES.find((f) => f.id === selectedFormatId) ??
      FORMAT_PREFERENCES[0];

    await DiscoveryProfileService.saveProfile({
      location: {
        cityId: cityObj.id,
        cityName: cityObj.name,
        mode: 'manual',
      },
      formats: formatObj.formats,
    });

    router.push('/(onboarding)/interests');
  };

  return (
    <Screen style={styles.container} scrollable>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View
          style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}
        >
          <MapPin size={24} color={colors.primary} />
        </View>
        <ThemeText variant="h1" style={styles.title}>
          Where should we look for events near you?
        </ThemeText>
        <ThemeText
          variant="body"
          themeColor="textMuted"
          style={styles.subtitle}
        >
          Choose your primary discovery city. You can still discover online
          events from anywhere.
        </ThemeText>
      </View>

      {/* ─── City Selection List ─── */}
      <View style={styles.cityList}>
        {CITIES.map((city) => {
          const isSelected = selectedCityId === city.id;
          return (
            <Card
              key={city.id}
              variant="outlined"
              padding="md"
              onPress={() => setSelectedCityId(city.id)}
              style={[
                styles.cityCard,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected
                    ? colors.primarySoft
                    : colors.surface,
                },
              ]}
            >
              <View style={styles.cityCardContent}>
                <View style={styles.cityInfo}>
                  <ThemeText variant="title" style={styles.cityName}>
                    {city.name}
                  </ThemeText>
                  <ThemeText variant="caption" themeColor="textMuted">
                    {city.subtitle}
                  </ThemeText>
                </View>
                {isSelected && (
                  <View
                    style={[
                      styles.selectedBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Navigation size={12} color={colors.textInverse} />
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </View>

      {/* ─── Format Preference Selector ─── */}
      <View style={styles.formatSection}>
        <ThemeText variant="subtitle" style={styles.formatTitle}>
          Event Formats
        </ThemeText>
        <View style={styles.formatChips}>
          {FORMAT_PREFERENCES.map((opt) => {
            const isSelected = selectedFormatId === opt.id;
            const Icon = opt.icon;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedFormatId(opt.id)}
                style={[
                  styles.formatChip,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected
                      ? colors.primarySoft
                      : colors.surface,
                  },
                ]}
              >
                <Icon
                  size={16}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <View style={styles.formatTextGroup}>
                  <ThemeText
                    variant="caption"
                    style={{
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '600' : '400',
                    }}
                  >
                    {opt.label}
                  </ThemeText>
                  {opt.badge && (
                    <ThemeText
                      variant="caption"
                      style={{ color: colors.primary, fontSize: 10 }}
                    >
                      ({opt.badge})
                    </ThemeText>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ─── Footer ─── */}
      <View style={styles.footer}>
        <Button
          title="Continue"
          variant="primary"
          size="large"
          onPress={handleContinue}
        />
        <ThemeText
          variant="caption"
          themeColor="textMuted"
          style={styles.privacyNote}
        >
          🔒 Privacy note: Manual city choice only. No GPS or IP tracking.
        </ThemeText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 20,
  },
  cityList: {
    gap: 10,
    marginBottom: 20,
  },
  cityCard: {
    borderWidth: 1.5,
  },
  cityCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityInfo: {
    flex: 1,
    paddingRight: 12,
  },
  cityName: {
    fontSize: 16,
    marginBottom: 2,
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatSection: {
    marginBottom: 24,
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  formatChips: {
    gap: 8,
  },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  formatTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footer: {
    gap: 12,
    marginTop: 4,
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
  },
});
