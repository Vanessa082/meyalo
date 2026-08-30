import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ForYouGreeting } from '@/components/for-you/for-you-greeting';
import { ForYouHeader } from '@/components/for-you/for-you-header';
import { ForYouSectionHeader } from '@/components/for-you/for-you-section-header';
import { CategoryFilterBar } from '@/components/ui/category-filter-bar';
import { EventCard } from '@/components/ui/event-card';
import { HeroMapCard } from '@/components/ui/hero-map-card';
import { PersonalizeBanner } from '@/components/ui/personalize-banner';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useForYouEvents } from '@/hooks/use-events';

/**
 * ForYouScreen
 *
 * The main discovery feed. Authentication state is propagated to child
 * components so they render appropriately for guests vs. signed-in users.
 *
 * TODO (Task 13): Replace the hardcoded `isAuthenticated = false` with the
 * real auth context value once Supabase auth is wired up.
 */
const IS_AUTHENTICATED = false; // swap to real auth context in Task 13
const CURRENT_USER_FIRST_NAME: string | null = null; // swap to real user in Task 13

export default function ForYouScreen() {
  const router = useRouter();
  const { data: events = [], isLoading, isError, refetch } = useForYouEvents();

  const handleExploreMap = () => {
    router.push('/(tabs)/around-you');
  };

  const handleSeeAll = () => {
    router.push('/(tabs)/explore');
  };

  const handleProfilePress = () => {
    // Unauthenticated → go to login; authenticated → go to profile tab
    if (IS_AUTHENTICATED) {
      router.push('/(tabs)/you');
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <Screen scrollable style={styles.container}>
      {/* 1. Theme-aware header */}
      <ForYouHeader
        isAuthenticated={IS_AUTHENTICATED}
        hasUnreadNotifications={false}
        avatarUrl={null}
        onPressProfile={handleProfilePress}
        onPressNotifications={() => {}}
      />

      {/* 2. Greeting — no name shown when unauthenticated */}
      <ForYouGreeting
        firstName={CURRENT_USER_FIRST_NAME ?? undefined}
        cityName="Yaoundé"
        countryName="Cameroon"
        onPressLocation={() => {}}
      />

      {/* 3. Spatial opportunity map card */}
      <HeroMapCard
        opportunityCount={events.length > 0 ? events.length * 4 : 12}
        city="Yaoundé"
        onExploreMap={handleExploreMap}
        onRefresh={() => refetch()}
      />

      {/* 4. Category filter bar */}
      <CategoryFilterBar />

      {/* 5. Section header */}
      <ForYouSectionHeader
        title="Happening soon"
        actionText="See all"
        onPressAction={handleSeeAll}
      />

      {/* 6. Event feed */}
      <View style={styles.feedList}>
        {isLoading ? (
          <ThemeText variant="caption">
            Loading opportunities near you...
          </ThemeText>
        ) : isError ? (
          <ThemeText variant="caption">
            Unable to load live feed. Pull to refresh.
          </ThemeText>
        ) : (
          events.map((event, index) => (
            <View key={event.id}>
              <EventCard event={event} />

              {/* Personalisation prompt after the 2nd card */}
              {index === 1 && <PersonalizeBanner />}
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  feedList: {
    marginBottom: 24,
  },
});
