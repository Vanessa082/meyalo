import { Image } from 'expo-image';
import {
  Bookmark,
  CheckCircle2,
  Footprints,
  MapPin,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { EventCardData } from '@/types/event.type';
import { ThemeText } from './theme-text';

interface EventCardProps {
  event: EventCardData;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const colors = useTheme();
  const [isSaved, setIsSaved] = useState(event.isSaved ?? false);

  const toggleSave = () => {
    setIsSaved(!isSaved);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        {
          backgroundColor: colors.surface,
          borderColor: '#E2E8F0',
        },
        pressed && styles.pressed,
      ]}
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
            />
          )}

          {event.dateBadgeText && (
            <View
              style={[
                styles.dateBadge,
                event.dateBadgeText === 'TOMORROW'
                  ? styles.tomorrowBadge
                  : styles.normalBadge,
              ]}
            >
              <ThemeText variant="captionBold" style={styles.dateBadgeText}>
                {event.dateBadgeText}
              </ThemeText>
            </View>
          )}
        </View>

        {/* Right Details Section */}
        <View style={styles.detailsContainer}>
          {/* Top Row: Date/Time + Bookmark Action */}
          <View style={styles.topRow}>
            <ThemeText variant="captionBold" style={styles.dateText}>
              {event.dateFormatted ?? event.startsAt}
            </ThemeText>
            <Pressable onPress={toggleSave} hitSlop={8}>
              <Bookmark
                size={18}
                color={isSaved ? '#087F73' : '#64748B'}
                fill={isSaved ? '#087F73' : 'none'}
                strokeWidth={1.75}
              />
            </Pressable>
          </View>

          {/* Event Title */}
          <ThemeText variant="subhead" numberOfLines={2} style={styles.title}>
            {event.title}
          </ThemeText>

          {/* Subtitle / Categories */}
          {event.subtitleCategories && (
            <ThemeText
              variant="caption"
              numberOfLines={1}
              style={styles.subtitle}
            >
              {event.subtitleCategories}
            </ThemeText>
          )}

          {/* Location */}
          <View style={styles.locationRow}>
            <MapPin size={13} color="#64748B" strokeWidth={2} />
            <ThemeText
              variant="caption"
              numberOfLines={1}
              style={styles.locationText}
            >
              {event.venueName ?? event.city ?? 'Yaoundé'}
            </ThemeText>
          </View>

          {/* Metadata Chips: Distance | Price | Type */}
          <View style={styles.chipsRow}>
            {event.distanceText && (
              <View style={[styles.chip, styles.neutralChip]}>
                <Footprints size={12} color="#475569" strokeWidth={2} />
                <ThemeText variant="caption" style={styles.neutralChipText}>
                  {event.distanceText}
                </ThemeText>
              </View>
            )}

            <View style={[styles.chip, styles.priceChip]}>
              <ThemeText variant="captionBold" style={styles.priceChipText}>
                {event.priceLabel ?? 'Free'}
              </ThemeText>
            </View>

            <View style={[styles.chip, styles.neutralChip]}>
              <ThemeText variant="caption" style={styles.neutralChipText}>
                {event.eventType}
              </ThemeText>
            </View>
          </View>

          {/* Trust Verification Badge */}
          <View style={styles.trustRow}>
            <CheckCircle2 size={13} color="#059669" strokeWidth={2} />
            <ThemeText variant="caption" style={styles.trustText}>
              {event.verificationText ??
                'Verified from organizer • Checked today'}
            </ThemeText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
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
  },
  dateBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tomorrowBadge: {
    backgroundColor: '#EA580C',
  },
  normalBadge: {
    backgroundColor: '#1E293B',
  },
  dateBadgeText: {
    color: '#FFFFFF',
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
  dateText: {
    color: '#087F73',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    color: '#0F172A',
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#475569',
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
  neutralChip: {
    backgroundColor: '#F1F5F9',
  },
  neutralChipText: {
    color: '#475569',
    fontSize: 11,
  },
  priceChip: {
    backgroundColor: '#ECFDF5',
  },
  priceChipText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
});
