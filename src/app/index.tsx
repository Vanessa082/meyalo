import { Redirect } from 'expo-router';
import { Platform, View } from 'react-native';
import { WebHome } from '@/components/website/web-home';
import { useHasEnteredApp } from '@/hooks/use-discovery-profile';
import { useTheme } from '@/hooks/use-theme';

/**
 * Phones: first launch shows the welcome screen; after "Explore first" or
 * finishing onboarding, launches open the tabs directly. The web shows the
 * website home page here (docs/product-decisions.md, Feature 20).
 */
export default function IndexScreen() {
  if (Platform.OS === 'web') return <WebHome />;
  return <AppEntry />;
}

function AppEntry() {
  const colors = useTheme();
  const { data: hasEntered, isPending } = useHasEnteredApp();

  if (isPending) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <Redirect href={hasEntered ? '/(tabs)' : '/(onboarding)/welcome'} />;
}
