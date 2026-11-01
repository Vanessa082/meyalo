import * as Linking from 'expo-linking';
import { MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { REGION } from '@/config/region';
import { geocoderAttribution, useVenueSearch } from '@/hooks/use-geocoder';
import { useTheme } from '@/hooks/use-theme';
import { isGeocodingError, type Place } from '@/services/geocoding';
import { Radius, Spacing } from '@/theme';
import { Banner, Field } from './console-ui';

interface VenueSearchProps {
  /** Starting query built from venue, address and city. */
  suggestedQuery: string;
  onPick: (place: Place) => void;
}

/**
 * Finds a venue's coordinates. One request per button press, never while
 * typing (the provider's usage policy), and the curator always chooses the
 * result: nothing is filled in automatically.
 */
export function VenueSearch({ suggestedQuery, onPick }: VenueSearchProps) {
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const search = useVenueSearch();
  const effectiveQuery = query.trim() || suggestedQuery;

  return (
    <View style={styles.container}>
      <Field
        label="Find the venue on the map"
        placeholder={suggestedQuery || 'Venue, street, neighbourhood, city'}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => search.mutate(effectiveQuery)}
        hint={`Searches ${REGION.name}. Pick a result to fill latitude and longitude.`}
      />
      <Button
        title="Find"
        variant="secondary"
        size="small"
        loading={search.isPending}
        disabled={!effectiveQuery}
        onPress={() => search.mutate(effectiveQuery)}
      />

      {search.error ? (
        <Banner
          tone="error"
          message={
            isGeocodingError(search.error)
              ? search.error.message
              : 'Venue search failed.'
          }
        />
      ) : null}

      {search.data && search.data.length === 0 ? (
        <Banner
          tone="info"
          message="No match. Try the neighbourhood and city, or paste coordinates from a map."
        />
      ) : null}

      {search.data?.map((place) => (
        <Pressable
          key={`${place.latitude},${place.longitude}`}
          accessibilityRole="button"
          onPress={() => {
            onPick(place);
            search.reset();
          }}
          style={({ pressed }) => [
            styles.result,
            {
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
            },
          ]}
        >
          <MapPin size={16} color={colors.primary} />
          <View style={styles.resultText}>
            <Text variant="callout">{place.label}</Text>
            <Text variant="footnote" tone="muted">
              {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
            </Text>
          </View>
        </Pressable>
      ))}

      {search.data ? (
        <Text
          variant="footnote"
          tone="muted"
          accessibilityRole="link"
          onPress={() => Linking.openURL(geocoderAttribution.url)}
        >
          Search by {geocoderAttribution.label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
});
