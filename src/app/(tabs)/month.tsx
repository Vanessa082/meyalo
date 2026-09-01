import { useRouter } from 'expo-router';
import {
  Bookmark,
  Calendar as CalendarIcon,
  Sparkles,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EventCard } from '@/components/ui/event-card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useForYouEvents } from '@/hooks/use-events';
import { useSavedEventIds } from '@/hooks/use-saved-events';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

export default function MonthScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { data: events = [], isLoading } = useForYouEvents();
  const { data: savedIds = [] } = useSavedEventIds();

  // Filter events whose IDs are saved in AsyncStorage
  const savedEvents = events.filter((e) => savedIds.includes(e.id));

  return (
    <Screen style={styles.container} scrollable>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <ThemeText variant="header">{t('tabs.month')}</ThemeText>
        <ThemeText variant="body" themeColor="textMuted">
          {t('month.subtitle')}
        </ThemeText>
      </View>

      {/* ─── Month Summary Card ─── */}
      <Card
        variant="flat"
        padding="md"
        style={[
          styles.summaryCard,
          { backgroundColor: colors.primarySoft, borderColor: colors.border },
        ]}
      >
        <View style={styles.summaryHeader}>
          <View
            style={[styles.iconCircle, { backgroundColor: colors.surface }]}
          >
            <CalendarIcon size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryText}>
            <ThemeText variant="subtitle">
              {t('month.scheduleHeader')}
            </ThemeText>
            <ThemeText variant="caption" themeColor="textMuted">
              {savedEvents.length} {t('month.eventsPlanned')}
            </ThemeText>
          </View>
        </View>
      </Card>

      {/* ─── Saved Events Agenda ─── */}
      {isLoading ? (
        <ThemeText variant="caption">
          Loading your saved month plan...
        </ThemeText>
      ) : savedEvents.length > 0 ? (
        <View style={styles.eventList}>
          <ThemeText variant="title" style={styles.sectionTitle}>
            {t('month.upcomingPlanned')}
          </ThemeText>
          {savedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/event/${event.id}` as never)}
            />
          ))}
        </View>
      ) : (
        /* ─── Empty State Card ─── */
        <Card
          variant="outlined"
          padding="lg"
          style={[styles.emptyCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.emptyContent}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Bookmark size={28} color={colors.primary} />
            </View>
            <ThemeText variant="title" style={styles.emptyTitle}>
              {t('month.noSavedTitle')}
            </ThemeText>
            <ThemeText
              variant="body"
              themeColor="textMuted"
              style={styles.emptyText}
            >
              {t('month.noSavedBody')}
            </ThemeText>
            <Button
              title={t('month.exploreButton')}
              variant="primary"
              size="medium"
              icon={<Sparkles size={16} color={colors.textInverse} />}
              onPress={() => router.push('/(tabs)/explore')}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 16,
    gap: 4,
  },
  summaryCard: {
    marginBottom: 20,
    borderWidth: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  eventList: {
    gap: 16,
    paddingBottom: 24,
  },
  emptyCard: {
    marginVertical: 12,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
});
