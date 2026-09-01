import { useRouter } from 'expo-router';
import { Compass, Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeOnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/(onboarding)/location');
  };

  const handleExploreFirst = () => {
    router.replace('/(tabs)');
  };

  return (
    <Screen style={styles.container}>
      {/* ─── Hero Content ─── */}
      <View style={styles.content}>
        <View
          style={[styles.badgeCircle, { backgroundColor: colors.primarySoft }]}
        >
          <Sparkles size={32} color={colors.primary} />
        </View>

        <ThemeText variant="h1" style={styles.title}>
          Find events worth showing up for.
        </ThemeText>

        <ThemeText
          variant="body"
          themeColor="textMuted"
          style={styles.subtitle}
        >
          Discover relevant workshops, conferences, meetups, masterclasses and
          professional events around you and online—without hunting across
          fragmented channels.
        </ThemeText>
      </View>

      {/* ─── Actions Footer ─── */}
      <View style={styles.footer}>
        <Button
          title="Get Started"
          variant="primary"
          size="large"
          onPress={handleGetStarted}
        />
        <Button
          title="Explore First"
          variant="ghost"
          size="large"
          icon={<Compass size={18} color={colors.primary} />}
          onPress={handleExploreFirst}
        />

        <ThemeText
          variant="caption"
          themeColor="textMuted"
          style={styles.privacyNote}
        >
          🔒 No account or sensitive permissions required to discover.
        </ThemeText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  content: {
    marginTop: 40,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    gap: 12,
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
});
