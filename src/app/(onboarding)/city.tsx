import AsyncStorage from '@react-native-async-storage/async-storage';
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

const PHYSICAL_CITIES = [
  {
    id: 'yaounde',
    name: 'Yaoundé',
    subtitle: 'Capital & Policy, Finance, Government Hub',
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
];

const FORMAT_OPTIONS = [
  { id: 'both', label: 'Both Physical & Virtual', icon: Layers },
  { id: 'physical', label: 'Physical Only', icon: Building2 },
  { id: 'virtual', label: 'Virtual Only', icon: Globe },
];

export default function CityOnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<string>('yaounde');
  const [selectedFormat, setSelectedFormat] = useState<string>('both');

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem('user_city', selectedCity);
      await AsyncStorage.setItem('user_format_preference', selectedFormat);
    } catch {
      // Ignore async storage error in fallback
    }
    router.push('/(onboarding)/interest');
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
          Select your primary discovery city
        </ThemeText>
        <ThemeText
          variant="body"
          themeColor="textMuted"
          style={styles.subtitle}
        >
          Choose your city for physical growth events. You can also customize
          your event format preferences below.
        </ThemeText>
      </View>

      {/* ─── City Selection List ─── */}
      <View style={styles.cityList}>
        {PHYSICAL_CITIES.map((city) => {
          const isSelected = selectedCity === city.id;
          return (
            <Card
              key={city.id}
              variant="outlined"
              padding="md"
              onPress={() => setSelectedCity(city.id)}
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
          Event Format Preference
        </ThemeText>
        <View style={styles.formatChips}>
          {FORMAT_OPTIONS.map((opt) => {
            const isSelected = selectedFormat === opt.id;
            const Icon = opt.icon;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedFormat(opt.id)}
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
                  size={14}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <ThemeText
                  variant="caption"
                  style={{
                    color: isSelected ? colors.primary : colors.text,
                    fontWeight: isSelected ? '600' : '400',
                  }}
                >
                  {opt.label}
                </ThemeText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ─── Bottom CTA ─── */}
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
          🔒 Privacy note: No device GPS permissions required.
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
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
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
