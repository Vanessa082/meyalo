import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { EventCard } from '@/components/ui/event-card';
import { HeroMapCard } from '@/components/ui/hero-map-card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useForYouEvents } from '@/hooks/use-events';
import { t } from '@/i18n';

export default function AroundYouScreen() {
  const router = useRouter();
  const { data: events = [], isLoading } = useForYouEvents();

  const physicalEvents = events.filter(
    (e) => e.format === 'in_person' || e.format === 'hybrid',
  );

  return (
    <Screen style={styles.container} scrollable>
      {/* Header */}
      <View style={styles.header}>
        <ThemeText variant="header">{t('tabs.aroundYou')}</ThemeText>
        <ThemeText variant="body" themeColor="textMuted">
          Explore physical growth events in Yaoundé, Douala, Buea, and
          surrounding hubs.
        </ThemeText>
      </View>

      {/* Hero Map Card */}
      <HeroMapCard
        opportunityCount={physicalEvents.length}
        city="Yaoundé"
        onExploreMap={() => {}}
      />

      {/* Events List */}
      <View style={styles.listHeader}>
        <ThemeText variant="title">Physical Events Nearby</ThemeText>
      </View>

      <View style={styles.eventList}>
        {isLoading ? (
          <ThemeText variant="caption">Loading nearby events...</ThemeText>
        ) : (
          physicalEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/event/${event.id}` as never)}
            />
          ))
        )}
      </View>
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
  listHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  eventList: {
    gap: 16,
    paddingBottom: 24,
  },
});
