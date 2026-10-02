import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Bookmark,
  CheckCircle2,
  Footprints,
  Globe,
  MapPin,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSavedEventIds, useToggleSaveEvent } from '@/hooks/use-saved-events';
import { useTheme } from '@/hooks/use-theme';
import type { EventCardData } from '@/types/event.type';
import { Card } from './card';
import { ThemeText } from './theme-text';

interface EventCardProps {
  event: EventCardData;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const colors = useTheme();
  const router = useRouter();
  const { data: savedIds = [] } = useSavedEventIds();
  const toggleSaveMutation = useToggleSaveEvent();

  const isSaved = savedIds.includes(event.id);

  const toggleSave = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    toggleSaveMutation.mutate(event.id);
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else if (event.id) {
      router.push(`/event/${event.id}`);
    }
  };

  return (
    <Card
      variant="outlined"
      padding="sm"
      onPress={handleCardPress}
      style={styles.card}
    >
      <View style={styles.cardContent}>
        {/* Left Image Thumbnail with Date Badge Overlay */}
        <View style={styles.imageContainer}>
          {event.coverImageUrl ? (
            <Image
              source={{ uri: event.coverImageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.placeholderImage,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <ThemeText
                variant="caption"
                numberOfLines={3}
                themeColor="textMuted"
                style={styles.placeholderLabel}
              >
                {event.primaryCategory || event.eventType}
              </ThemeText>
            </View>
          )}

          {event.dateBadgeText && (
            <View
              style={[
                styles.dateBadge,
                {
                  backgroundColor:
                    event.dateBadgeText === 'TODAY' ||
                    event.dateBadgeText === 'TOMORROW'
                      ? colors.warning
                      : colors.text,
                },
              ]}
            >
              <ThemeText
                variant="caption"
                style={[styles.dateBadgeText, { color: colors.textInverse }]}
              >
                {event.dateBadgeText}
              </ThemeText>
            </View>
          )}
        </View>

        {/* Right Details Section */}
        <View style={styles.detailsContainer}>
          {/* Top Row: Date/Time + Bookmark Action */}
          <View style={styles.topRow}>
            <ThemeText variant="caption" themeColor="primary">
              {event.dateFormatted ?? event.startsAt}
            </ThemeText>
            <Pressable onPress={toggleSave} hitSlop={8}>
              <Bookmark
                size={18}
                color={isSaved ? colors.primary : colors.textMuted}
                fill={isSaved ? colors.primary : 'none'}
                strokeWidth={1.75}
              />
            </Pressable>
          </View>

          {/* Event Title */}
          <ThemeText variant="title" numberOfLines={2} style={styles.title}>
            {event.title}
          </ThemeText>

          {/* Subtitle / Categories */}
          {event.primaryCategory && (
            <ThemeText
              variant="caption"
              numberOfLines={1}
              themeColor="textMuted"
              style={styles.subtitle}
            >
              {event.primaryCategory}
            </ThemeText>
          )}

          {/* Location / Format */}
          <View style={styles.locationRow}>
            {event.format === 'virtual' ? (
              <Globe size={13} color={colors.textMuted} strokeWidth={2} />
            ) : (
              <MapPin size={13} color={colors.textMuted} strokeWidth={2} />
            )}
            <ThemeText
              variant="caption"
              numberOfLines={1}
              themeColor="textMuted"
            >
              {event.format === 'virtual'
                ? 'Online'
                : event.venueName
                  ? event.city
                    ? `${event.venueName}, ${event.city}`
                    : event.venueName
                  : (event.city ?? 'Venue to be confirmed')}
            </ThemeText>
          </View>

          {/* Metadata Chips: Price | Format | Category */}
          <View style={styles.chipsRow}>
            {event.distanceText && (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Footprints
                  size={12}
                  color={colors.textMuted}
                  strokeWidth={2}
                />
                <ThemeText variant="caption" themeColor="textMuted">
                  {event.distanceText}
                </ThemeText>
              </View>
            )}

            <View
              style={[styles.chip, { backgroundColor: colors.primarySoft }]}
            >
              <ThemeText variant="caption" themeColor="primary">
                {event.priceLabel ?? 'Price not stated'}
              </ThemeText>
            </View>

            <View
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <ThemeText variant="caption" themeColor="textMuted">
                {event.format === 'virtual'
                  ? 'Virtual'
                  : event.format === 'hybrid'
                    ? 'Hybrid'
                    : 'In-Person'}
              </ThemeText>
            </View>
          </View>

          {event.verificationText ? (
            <View style={styles.trustRow}>
              {event.verificationState === 'source_confirmed' ||
              event.verificationState === 'organizer_confirmed' ? (
                <CheckCircle2
                  size={13}
                  color={colors.success}
                  strokeWidth={2}
                />
              ) : null}
              <ThemeText
                variant="caption"
                themeColor={
                  event.verificationState === 'unreviewed'
                    ? 'textMuted'
                    : 'success'
                }
              >
                {event.verificationText}
              </ThemeText>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    width: 104,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  placeholderLabel: {
    textAlign: 'center',
  },
  dateBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    marginVertical: 2,
  },
  subtitle: {
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
