import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Check, Target } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';

const GOALS = [
  {
    id: 'grow_business',
    title: 'Grow a business / Raise capital',
    description: 'Find investor sessions, tax masterclasses, SME forums',
  },
  {
    id: 'find_job',
    title: 'Find work / Career advancement',
    description: 'Career fairs, hiring events, resume & interview clinics',
  },
  {
    id: 'learn_skills',
    title: 'Learn new skills & certifications',
    description: 'Technical masterclasses, workshops, certification bootcamps',
  },
  {
    id: 'expand_network',
    title: 'Meet peers & industry leaders',
    description: 'Networking mixers, founder meetups, professional gatherings',
  },
  {
    id: 'stay_informed',
    title: 'Stay informed on sector trends',
    description: 'Keynotes, industry expos, market insight webinars',
  },
];

export default function GoalOnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    'grow_business',
    'learn_skills',
  ]);

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('user_goals', JSON.stringify(selectedGoals));
      await AsyncStorage.setItem('has_completed_onboarding', 'true');
    } catch {
      // Ignore async storage error in fallback
    }
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
          What are your primary goals right now?
        </ThemeText>
        <ThemeText
          variant="body"
          themeColor="textMuted"
          style={styles.subtitle}
        >
          This helps Meyalo match specific, high-intent rooms to your immediate
          goals.
        </ThemeText>
      </View>

      {/* ─── Multi-Select Goal List ─── */}
      <View style={styles.goalList}>
        {GOALS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
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

      {/* ─── Footer ─── */}
      <View style={styles.footer}>
        <Button
          title="Get Started"
          variant="primary"
          size="large"
          disabled={selectedGoals.length === 0}
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
  goalList: {
    gap: 12,
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
    marginTop: 8,
  },
});
