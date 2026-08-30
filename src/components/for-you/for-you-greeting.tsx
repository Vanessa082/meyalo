/**
 * ForYouGreeting
 *
 * Auth-aware greeting. Shows "Good afternoon 👋" without a name when the
 * user is not authenticated. A first name is only shown once logged in.
 */
import { ChevronDown, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';

function getGreetingPrefix(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

interface ForYouGreetingProps {
  /** Pass only when the user is authenticated. Leave undefined for guests. */
  firstName?: string | null;
  cityName?: string;
  countryName?: string;
  onPressLocation?: () => void;
}

export function ForYouGreeting({
  firstName,
  cityName = 'Yaoundé',
  countryName = 'Cameroon',
  onPressLocation,
}: ForYouGreetingProps) {
  const colors = useTheme();
  const prefix = getGreetingPrefix();

  // Only append the user's name when authenticated and known.
  const greeting = firstName ? `${prefix}, ${firstName} 👋` : `${prefix} 👋`;

  return (
    <View style={styles.greetingContainer}>
      <ThemeText variant="caption" style={styles.greetingText}>
        {greeting}
      </ThemeText>

      <Text style={[styles.mainHeaderTitle, { color: colors.text }]}>
        Here&apos;s what&apos;s happening{'\n'}around{' '}
        <Text style={styles.highlightYou}>you</Text>
      </Text>

      <Pressable style={styles.locationSelector} onPress={onPressLocation}>
        <MapPin size={16} color="#087F73" strokeWidth={2.2} />
        <ThemeText
          variant="subhead"
          style={[styles.locationText, { color: colors.text }]}
        >
          {cityName}, {countryName}
        </ThemeText>
        <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  greetingContainer: {
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  mainHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 8,
  },
  highlightYou: {
    color: '#087F73',
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
