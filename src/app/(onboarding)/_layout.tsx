import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { Duration } from '@/theme';

export default function OnboardingLayout() {
  const colors = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? 'fade' : 'slide_from_right',
        animationDuration: Duration.screen,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
