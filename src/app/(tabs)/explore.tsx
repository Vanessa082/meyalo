import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CategoryFilterBar } from '@/components/ui/category-filter-bar';
import { EventCard } from '@/components/ui/event-card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { t } from '@/i18n';
import { EventService } from '@/services/event.service';
import type { EventCardData } from '@/types/event.type';

export default function ExploreScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [events, setEvents] = useState<EventCardData[]>([]);

  useEffect(() => {
    EventService.fetchForYouEvents().then(setEvents);
  }, []);

  const filteredEvents = events.filter((e) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'work') {
      return (
        e.primaryCategory.toLowerCase().includes('job') ||
        e.primaryCategory.toLowerCase().includes('skill') ||
        e.primaryCategory.toLowerCase().includes('career')
      );
    }
    if (selectedCategory === 'business') {
      return (
        e.primaryCategory.toLowerCase().includes('build') ||
        e.primaryCategory.toLowerCase().includes('connect') ||
        e.primaryCategory.toLowerCase().includes('business')
      );
    }
    if (selectedCategory === 'learning') {
      return (
        e.primaryCategory.toLowerCase().includes('software') ||
        e.primaryCategory.toLowerCase().includes('ai') ||
        e.primaryCategory.toLowerCase().includes('code')
      );
    }
    return true;
  });

  return (
    <Screen style={styles.container} scrollable>
      {/* Header */}
      <View style={styles.header}>
        <ThemeText variant="header">{t('tabs.explore')}</ThemeText>
        <ThemeText variant="body" themeColor="textMuted">
          Discover growth sectors, workshops, and virtual opportunities across
          Africa.
        </ThemeText>
      </View>

      {/* Category Filters */}
      <CategoryFilterBar
        selectedId={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Event Cards List */}
      <View style={styles.eventList}>
        {filteredEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onPress={() => router.push(`/event/${event.id}` as never)}
          />
        ))}
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
  eventList: {
    gap: 16,
    paddingBottom: 24,
  },
});
