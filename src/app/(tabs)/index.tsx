import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { DiscoveryProfileService } from '@/services/discovery-profile.service';
import { rankEventsList } from '@/services/ranking.service';
import type { LocalDiscoveryProfile } from '@/types/discovery-profile';

const IS_AUTHENTICATED = false;
const CURRENT_USER_FIRST_NAME: string | null = null;

export default function ForYouScreen() {
  const router = useRouter();
  const {
    data: rawEvents = [],
    isLoading,
    isError,
    refetch,
  } = useForYouEvents();
  const [profile, setProfile] = useState<LocalDiscoveryProfile | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      const p = await DiscoveryProfileService.loadProfile();
      setProfile(p);
    }
    fetchProfile();
  }, []);

  // Apply deterministic ranking using profile preferences
  const events = rankEventsList(rawEvents, profile);

  const cityName = profile?.location?.cityName ?? 'Yaoundé';

  const handleExploreMap = () => {
    router.push('/(tabs)/around-you');
  };

  const handleSeeAll = () => {
    router.push('/(tabs)/explore');
  };

  const handleProfilePress = () => {
    if (IS_AUTHENTICATED) {
      router.push('/(tabs)/you');
    } else {
      router.push('/(tabs)/you'); // Route to preferences/profile tab
    }
  };

  const handleLocationPress = () => {
    router.push('/(onboarding)/location');
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

      {/* 2. Greeting — showing active discovery city */}
      <ForYouGreeting
        firstName={CURRENT_USER_FIRST_NAME ?? undefined}
        cityName={cityName}
        countryName="Cameroon"
        onPressLocation={handleLocationPress}
      />

      {/* 3. Spatial opportunity map card */}
      <HeroMapCard
        opportunityCount={events.length > 0 ? events.length : 12}
        city={cityName}
        onExploreMap={handleExploreMap}
        onRefresh={() => refetch()}
      />

      {/* 4. Category filter bar */}
      <CategoryFilterBar />

      {/* 5. Section header */}
      <ForYouSectionHeader
        title="Personalised for you"
        actionText="See all"
        onPressAction={handleSeeAll}
      />

      {/* 6. Event feed */}
      <View style={styles.feedList}>
        {isLoading ? (
          <ThemeText variant="caption">
            Loading opportunities near {cityName}...
          </ThemeText>
        ) : isError ? (
          <ThemeText variant="caption">
            Unable to load live feed. Pull to refresh.
          </ThemeText>
        ) : events.length === 0 ? (
          <ThemeText variant="caption" style={{ marginTop: 12 }}>
            No matching events found for your current filter preferences. Try
            broadening your location or interest settings.
          </ThemeText>
        ) : (
          events.map((event, index) => (
            <View key={event.id}>
              <EventCard event={event} />
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
