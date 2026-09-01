import { useRouter } from 'expo-router';
import { MapPin, RefreshCw, Sliders, Target } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';
import { DiscoveryProfileService } from '@/services/discovery-profile.service';
import type { LocalDiscoveryProfile } from '@/types/discovery-profile';

export default function YouScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<LocalDiscoveryProfile | null>(null);

  useEffect(() => {
    async function load() {
      const p = await DiscoveryProfileService.loadProfile();
      setProfile(p);
    }
    load();
  }, []);

  const handleResetProfile = async () => {
    await DiscoveryProfileService.clearProfile();
    router.replace('/(onboarding)/welcome');
  };

  return (
    <Screen scrollable style={styles.container}>
      <View style={styles.header}>
        <ThemeText variant="h1" style={styles.title}>
          Discovery Preferences
        </ThemeText>
        <ThemeText variant="body" themeColor="textMuted">
          Manage your location, event formats, interests, and growth goals.
        </ThemeText>
      </View>

      {/* ─── Profile Overview Card ─── */}
      <View style={styles.section}>
        <Card variant="outlined" padding="md" style={styles.card}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <MapPin size={20} color={colors.primary} />
            </View>
            <View style={styles.cardTitleGroup}>
              <ThemeText variant="title">Discovery Location</ThemeText>
              <ThemeText variant="caption" themeColor="textMuted">
                {profile?.location?.cityName ?? 'Not set'}
              </ThemeText>
            </View>
            <Button
              title="Edit"
              variant="ghost"
              size="small"
              onPress={() => router.push('/(onboarding)/location')}
            />
          </View>
        </Card>

        <Card variant="outlined" padding="md" style={styles.card}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Sliders size={20} color={colors.primary} />
            </View>
            <View style={styles.cardTitleGroup}>
              <ThemeText variant="title">Interests</ThemeText>
              <ThemeText variant="caption" themeColor="textMuted">
                {profile?.interestIds?.length
                  ? `${profile.interestIds.length} sectors selected`
                  : 'All sectors'}
              </ThemeText>
            </View>
            <Button
              title="Edit"
              variant="ghost"
              size="small"
              onPress={() => router.push('/(onboarding)/interests')}
            />
          </View>
        </Card>

        <Card variant="outlined" padding="md" style={styles.card}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Target size={20} color={colors.primary} />
            </View>
            <View style={styles.cardTitleGroup}>
              <ThemeText variant="title">Growth Goals</ThemeText>
              <ThemeText variant="caption" themeColor="textMuted">
                {profile?.goalIds?.length
                  ? `${profile.goalIds.length} goals active`
                  : 'All goals'}
              </ThemeText>
            </View>
            <Button
              title="Edit"
              variant="ghost"
              size="small"
              onPress={() => router.push('/(onboarding)/goals')}
            />
          </View>
        </Card>
      </View>

      {/* ─── Actions ─── */}
      <View style={styles.actionsSection}>
        <Button
          title="Reset Discovery Profile"
          variant="outline"
          size="medium"
          icon={<RefreshCw size={16} color={colors.primary} />}
          onPress={handleResetProfile}
        />
        <ThemeText
          variant="caption"
          themeColor="textMuted"
          style={styles.privacyNote}
        >
          🔒 Saved locally on device (`meyalo.discoveryProfile.v1`). No tracking
          or personal data collection.
        </ThemeText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 4,
  },
  section: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleGroup: {
    flex: 1,
  },
  actionsSection: {
    gap: 12,
    alignItems: 'center',
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
  },
});
