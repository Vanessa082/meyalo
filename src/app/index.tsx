import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';
import { DiscoveryProfileService } from '@/services/discovery-profile.service';

export default function IndexScreen() {
  const colors = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const completed =
          await DiscoveryProfileService.hasCompletedOnboarding();
        setHasCompleted(completed);
      } catch {
        setHasCompleted(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <Screen style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemeText
          variant="caption"
          themeColor="textMuted"
          style={styles.loadingText}
        >
          Preparing your discovery radar...
        </ThemeText>
      </Screen>
    );
  }

  if (hasCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(onboarding)/welcome" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    marginTop: 8,
  },
});
