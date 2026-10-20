import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useHasEnteredApp } from '@/hooks/use-discovery-profile';
import { useTheme } from '@/hooks/use-theme';

/**
 * First launch shows the welcome screen. After "Explore first" or finishing
 * onboarding, launches open the tabs directly.
 */
export default function IndexScreen() {
  const colors = useTheme();
  const { data: hasEntered, isPending } = useHasEnteredApp();

  if (isPending) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <Redirect href={hasEntered ? '/(tabs)' : '/(onboarding)/welcome'} />;
}
