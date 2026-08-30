import { StyleSheet, View } from 'react-native';
import { EventCard } from '@/components/ui/event-card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useForYouEvents } from '@/hooks/use-events';
import { t } from '@/i18n';

export default function ForYouScreen() {
  const { data: events = [], isLoading, isError } = useForYouEvents();

  return (
    <Screen scrollable style={styles.container}>
      <View style={styles.header}>
        <ThemeText variant="header">{t('tabs.forYou')}</ThemeText>
        <ThemeText variant="caption">
          Discover tailored growth opportunities in Cameroon
        </ThemeText>
      </View>

      <View style={styles.feedList}>
        {isLoading ? (
          <ThemeText variant="caption">Loading opportunities...</ThemeText>
        ) : isError ? (
          <ThemeText variant="caption">
            Unable to load feed. Pull down to refresh.
          </ThemeText>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    marginBottom: 16,
  },
  feedList: {
    gap: 12,
  },
});
