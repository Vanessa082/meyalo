import { useRouter } from 'expo-router';
import { Check, Compass, Sliders } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { INTEREST_OPTIONS } from '@/config/discovery/interests';
import { useTheme } from '@/hooks/use-theme';
import { DiscoveryProfileService } from '@/services/discovery-profile.service';

export default function InterestsOnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>([
    'technology',
    'business',
  ]);

  const toggleInterest = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleContinue = async () => {
    await DiscoveryProfileService.saveProfile({
      interestIds: selectedIds,
    });
    router.push('/(onboarding)/goals');
  };

  const handleSkip = async () => {
    await DiscoveryProfileService.saveProfile({
      interestIds: [],
    });
    router.push('/(onboarding)/goals');
  };

  return (
    <Screen style={styles.container} scrollable>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View
          style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}
        >
          <Sliders size={24} color={colors.primary} />
        </View>
        <ThemeText variant="h1" style={styles.title}>
          What are you interested in?
        </ThemeText>
        <ThemeText
          variant="body"
          themeColor="textMuted"
          style={styles.subtitle}
        >
          Select sectors and fields relevant to you. We use this to surface
          high-signal events.
        </ThemeText>
      </View>

      {/* ─── Interests Grid / List ─── */}
      <View style={styles.interestList}>
        {INTEREST_OPTIONS.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <Card
              key={item.id}
              variant="outlined"
              padding="md"
              onPress={() => toggleInterest(item.id)}
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
                    {item.title}
                  </ThemeText>
                  <ThemeText variant="caption" themeColor="textMuted">
                    {item.description}
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

      {/* ─── Footer Actions ─── */}
      <View style={styles.footer}>
        <Button
          title="Continue"
          variant="primary"
          size="large"
          onPress={handleContinue}
        />
        <Button
          title="Not sure yet (Skip)"
          variant="ghost"
          size="large"
          icon={<Compass size={18} color={colors.primary} />}
          onPress={handleSkip}
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
  interestList: {
    gap: 10,
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
    gap: 8,
  },
});
