import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { CategoryFilterBar } from '@/components/ui/category-filter-bar';
import { EventCard } from '@/components/ui/event-card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useForYouEvents } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

/**
 * Normalizes text for accent-insensitive search (e.g., "Yaoundé" matches "yaounde").
 */
function normalizeSearchText(str: string): string {
  return (str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function ExploreScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: events = [], isLoading } = useForYouEvents();

  const filteredEvents = events.filter((e) => {
    // 1. Keyword search filter
    if (searchQuery.trim().length > 0) {
      const q = normalizeSearchText(searchQuery);
      const titleMatch = normalizeSearchText(e.title).includes(q);
      const descMatch = normalizeSearchText(e.description ?? '').includes(q);
      const organizerMatch = normalizeSearchText(e.organizerName).includes(q);
      const cityMatch = normalizeSearchText(e.city ?? '').includes(q);
      const categoryMatch = normalizeSearchText(
        e.primaryCategory ?? '',
      ).includes(q);

      if (
        !titleMatch &&
        !descMatch &&
        !organizerMatch &&
        !cityMatch &&
        !categoryMatch
      ) {
        return false;
      }
    }

    // 2. Category tab filter
    if (selectedCategory === 'all') return true;

    const cat = (e.primaryCategory ?? e.eventType ?? '').toLowerCase();

    if (selectedCategory === 'work') {
      return (
        cat.includes('job') ||
        cat.includes('skill') ||
        cat.includes('career') ||
        cat.includes('tech') ||
        cat.includes('software')
      );
    }
    if (selectedCategory === 'business') {
      return (
        cat.includes('build') ||
        cat.includes('connect') ||
        cat.includes('business') ||
        cat.includes('finance') ||
        cat.includes('agri')
      );
    }
    if (selectedCategory === 'learning') {
      return (
        cat.includes('software') ||
        cat.includes('ai') ||
        cat.includes('code') ||
        cat.includes('masterclass') ||
        cat.includes('education')
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

      {/* ─── Search Input Bar ─── */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by keyword, topic, or city..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Category Filters */}
      <CategoryFilterBar
        selectedId={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Event Cards List */}
      <View style={styles.eventList}>
        {isLoading ? (
          <ThemeText variant="caption">Loading opportunities...</ThemeText>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemeText variant="title">No matching opportunities</ThemeText>
            <ThemeText variant="caption" themeColor="textMuted">
              Try adjusting your search keyword or category filter.
            </ThemeText>
          </View>
        ) : (
          filteredEvents.map((event) => (
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  eventList: {
    gap: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
});
