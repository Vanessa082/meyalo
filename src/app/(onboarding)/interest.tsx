import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Check, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';

const INTERESTS = [
  {
    id: 'business',
    title: 'Business & Entrepreneurship',
    description: 'SME growth, tax compliance, startup pitching, funding',
  },
  {
    id: 'technology',
    title: 'Software & Technology',
    description:
      'Mobile & web development, AI, cloud engineering, tech meetups',
  },
  {
    id: 'career',
    title: 'Career & Leadership',
    description: 'Professional networking, mentorship, resume workshops',
  },
  {
    id: 'finance',
    title: 'Finance & Investment',
    description: 'Banking, fintech, capital raising, corporate finance',
  },
  {
    id: 'agriculture',
    title: 'Agriculture & Trade',
    description: 'Agribusiness, African export standards, supply chain',
  },
  {
    id: 'masterclass',
    title: 'Education & Masterclasses',
    description: 'Skill certifications, technical workshops, training sessions',
  },
];

export default function InterestOnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'business',
    'technology',
  ]);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleNext = async () => {
    try {
      await AsyncStorage.setItem(
        'user_interests',
        JSON.stringify(selectedInterests),
      );
    } catch {
      // Ignore async storage error in fallback
    }
    router.push('/(onboarding)/goal');
  };

  return (
    <Screen style={styles.container} scrollable>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View
          style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}
        >
          <Sparkles size={24} color={colors.primary} />
        </View>
        <ThemeText variant="h1" style={styles.title}>
          What topics matter to you?
        </ThemeText>
        <ThemeText
          variant="body"
          themeColor="textMuted"
          style={styles.subtitle}
        >
          Select at least 1 growth area to personalize your discovery radar.
        </ThemeText>
      </View>

      {/* ─── Multi-Select Interest List ─── */}
      <View style={styles.interestList}>
        {INTERESTS.map((interest) => {
          const isSelected = selectedInterests.includes(interest.id);
          return (
            <Card
              key={interest.id}
              variant="outlined"
              padding="md"
              onPress={() => toggleInterest(interest.id)}
              style={[
                styles.interestCard,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected
                    ? colors.primarySoft
                    : colors.surface,
                },
              ]}
            >
              <View style={styles.cardContent}>
                <View style={styles.infoText}>
                  <ThemeText variant="title" style={styles.interestTitle}>
                    {interest.title}
                  </ThemeText>
                  <ThemeText variant="caption" themeColor="textMuted">
                    {interest.description}
                  </ThemeText>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected
                        ? colors.primary
                        : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <Check
                      size={14}
                      color={colors.textInverse}
                      strokeWidth={3}
                    />
                  )}
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      {/* ─── Footer ─── */}
      <View style={styles.footer}>
        <Button
          title="Continue to Goals"
          variant="primary"
          size="large"
          disabled={selectedInterests.length === 0}
          onPress={handleNext}
        />
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
  interestList: {
    gap: 12,
    marginBottom: 24,
  },
  interestCard: {
    borderWidth: 1.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoText: {
    flex: 1,
    paddingRight: 12,
  },
  interestTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 8,
  },
});
