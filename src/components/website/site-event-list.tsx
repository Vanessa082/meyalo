import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { focusRing } from '@/components/ui/focus';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { REGION } from '@/config/region';
import { useTheme } from '@/hooks/use-theme';
import { formatDayHeading } from '@/i18n/format';
import { useTranslation } from '@/i18n/locale-provider';
import { type ListingItem, upcomingByDay } from '@/services/event-listing';
import { formatEventDate } from '@/services/event-mapping';
import { Radius, Spacing } from '@/theme';

/**
 * Upcoming events from the last web build, grouped by day, each a real link
 * to its page (an <a> on the web, so search engines follow it). Events that
 * have started are never shown, even if the build is a day old.
 */
export function SiteEventList({
  items,
  limit,
}: {
  items: readonly ListingItem[];
  limit?: number;
}) {
  const colors = useTheme();
  const i18n = useTranslation();
  const { t, language } = i18n;

  let remaining = limit ?? Number.POSITIVE_INFINITY;
  const days = upcomingByDay(items, new Date(), REGION.timeZone)
    .map((day) => {
      const shown = day.items.slice(0, Math.max(0, remaining));
      remaining -= shown.length;
      return { ...day, items: shown };
    })
    .filter((day) => day.items.length > 0);

  if (days.length === 0) {
    return (
      <Text variant="callout" tone="muted">
        {t('site.noEvents')}
      </Text>
    );
  }

  return (
    <Stack gap="lg">
      {days.map((day) => (
        <Stack key={day.date} gap="sm">
          <Text variant="headline" accessibilityRole="header">
            {formatDayHeading(day.date, language)}
          </Text>
          {day.items.map((item) => (
            <Link key={item.id} href={`/event/${item.id}`} asChild>
              <Pressable
                style={(state) => [
                  styles.card,
                  {
                    borderColor: colors.border,
                    backgroundColor: state.pressed
                      ? colors.surfaceSunken
                      : colors.surface,
                  },
                  focusRing(state, colors),
                ]}
              >
                <Text variant="headline" style={styles.title}>
                  {item.title}
                </Text>
                <Text variant="footnote" tone="muted">
                  {[
                    formatEventDate(item.startsAt, item.timezone, i18n),
                    item.format === 'virtual'
                      ? t('eventCard.online')
                      : item.city,
                    item.category,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Pressable>
            </Link>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  title: {
    flexShrink: 1,
  },
});
