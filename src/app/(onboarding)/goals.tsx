import { useRouter } from 'expo-router';
import { Check, Target } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { GOAL_OPTIONS } from '@/config/discovery/goals';
import { useTheme } from '@/hooks/use-theme';
import { DiscoveryProfileService } from '@/services/discovery-profile.service';

export default function GoalsOnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();

  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([
    'learn_skills',
    'grow_business',
  ]);

  const toggleGoal = (id: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleFinish = async () => {
    await DiscoveryProfileService.saveProfile({
      goalIds: selectedGoalIds,
    });
    router.replace('/(tabs)');
  };

  return (
    <Screen style={styles.container} scrollable>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View
          style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}
        >
          <Target size={24} color={colors.primary} />
        </View>
        <ThemeText variant="h1" style={styles.title}>
          What are you trying to do?
        </ThemeText>
        <ThemeText
          variant="body"
          themeColor="textMuted"
          style={styles.subtitle}
        >
          This helps Meyalo rank high-intent opportunities matching your current
          goals.
        </ThemeText>
      </View>

      {/* ─── Goals Selection List ─── */}
      <View style={styles.goalList}>
        {GOAL_OPTIONS.map((goal) => {
          const isSelected = selectedGoalIds.includes(goal.id);
          return (
            <Card
              key={goal.id}
              variant="outlined"
              padding="md"
              onPress={() => toggleGoal(goal.id)}
              style={[
                styles.goalCard,
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
                  <ThemeText variant="title" style={styles.goalTitle}>
                    {goal.title}
                  </ThemeText>
                  <ThemeText variant="caption" themeColor="textMuted">
                    {goal.description}
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

      {/* ─── Footer Action ─── */}
      <View style={styles.footer}>
        <Button
          title="See My Personalised Feed"
          variant="primary"
          size="large"
          onPress={handleFinish}
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
  goalList: {
    gap: 10,
    marginBottom: 24,
  },
  goalCard: {
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
  goalTitle: {
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
    marginTop: 4,
  },
});
