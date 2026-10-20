/**
 * ForYouGreeting
 *
 * Greeting, headline and the city selector. A first name is shown only for a
 * signed-in user; guests get the greeting alone.
 */
import { ChevronDown, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import { Spacing, TouchTargets } from '@/theme';

function greetingKey(hour: number): TxKeyPath {
  if (hour < 12) return 'forYou.greetingMorning';
  if (hour < 17) return 'forYou.greetingAfternoon';
  return 'forYou.greetingEvening';
}

interface ForYouGreetingProps {
  /** Pass only when the user is signed in. */
  firstName?: string | null;
  /** The profile area: a city name, online only, or not chosen. */
  area: { kind: 'city'; name: string } | { kind: 'online_only' } | null;
  onPressLocation?: () => void;
}

export function ForYouGreeting({
  firstName,
  area,
  onPressLocation,
}: ForYouGreetingProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const prefix = t(greetingKey(new Date().getHours()));
  const greeting = firstName ? `${prefix}, ${firstName}` : prefix;

  const location =
    area?.kind === 'city'
      ? t('forYou.cityCountry', { city: area.name })
      : area?.kind === 'online_only'
        ? t('forYou.onlineOnly')
        : t('forYou.chooseCity');

  return (
    <View style={styles.container}>
      <Text variant="callout" tone="muted">
        {greeting}
      </Text>
      <Text variant="title1" accessibilityRole="header">
        {t('forYou.headline')}
      </Text>
      <Pressable
        style={styles.locationSelector}
        onPress={onPressLocation}
        accessibilityRole="button"
        accessibilityLabel={location}
        hitSlop={8}
      >
        <MapPin size={16} color={colors.primary} strokeWidth={2.2} />
        <Text variant="label">{location}</Text>
        <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    // A full touch target, though it reads as a line of text.
    minHeight: TouchTargets.minimum,
  },
});
