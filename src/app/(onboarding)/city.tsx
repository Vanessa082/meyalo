import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MapPin, Navigation } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';

const CITIES = [
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
  {
    id: 'virtual',
    name: 'Virtual / Anywhere',
    subtitle: 'Online Conferences, Masterclasses & Webinars',
  },
];

export default function CityOnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<string>('yaounde');

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem('user_city', selectedCity);
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
          Where do you want to discover opportunities?
        </ThemeText>
        <ThemeText
          variant="body"
          themeColor="textMuted"
          style={styles.subtitle}
        >
          Meyalo highlights growth events near you and top virtual experiences
          across Africa.
        </ThemeText>
      </View>

      {/* ─── City Selection List ─── */}
      <View style={styles.cityList}>
        {CITIES.map((city) => {
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
    marginBottom: 24,
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
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 22,
  },
  cityList: {
    gap: 12,
    marginBottom: 24,
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
  footer: {
    gap: 12,
    marginTop: 8,
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
  },
});
