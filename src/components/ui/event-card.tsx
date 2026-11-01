import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Bookmark,
  EyeOff,
  Footprints,
  Globe,
  MapPin,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSaveToggle } from '@/components/event/use-save-toggle';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { dateParts, describeEventCard } from '@/services/event-mapping';
import { Radius, Spacing, TouchTargets } from '@/theme';
import type { EventCardData } from '@/types/event.type';
import { Card } from './card';
import { Pop } from './motion';
import { Text } from './text';
import { VerifiedBadge } from './verified-badge';

interface EventCardProps {
  event: EventCardData;
  onPress?: () => void;
  /** Translated "why this fits" line, shown only for personalized picks. */
  reasonText?: string;
  /** Shows a "Not interested" button; For You hides the event. */
  onNotInterested?: () => void;
}

export function EventCard({
  event,
  onPress,
  reasonText,
  onNotInterested,
}: EventCardProps) {
  const colors = useTheme();
  const i18n = useTranslation();
  const { t } = i18n;
  const text = describeEventCard(event, i18n);
  const router = useRouter();
  const { isSaved, toggle } = useSaveToggle(event);
  const date = dateParts(event.startsAt, event.timezone || null, i18n);

  const toggleSave = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    toggle();
  };

  const notInterested = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    onNotInterested?.();
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else if (event.id) {
      router.push(`/event/${event.id}`);
    }
  };

  return (
    <Card variant="outlined" padding="sm" onPress={handleCardPress}>
      <View style={styles.cardContent}>
        {/* Left Image Thumbnail with Date Badge Overlay */}
        <View style={styles.imageContainer}>
          {event.coverImageUrl ? (
            <Image
              source={{ uri: event.coverImageUrl }}
              style={styles.image}
              accessible
              accessibilityLabel={event.coverImageAlt}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.placeholderImage,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              aria-hidden
            >
              <Text
                variant="headline"
                weight="extraBold"
                style={{ color: colors.primary }}
              >
                {date.day}
              </Text>
              <Text variant="caption" weight="bold" tone="muted">
                {date.month}
              </Text>
            </View>
          )}

          {event.coverImageUrl && text.badge && (
            <View
              style={[
                styles.dateBadge,
                {
                  backgroundColor:
                    text.badge.kind === 'date' ? colors.text : colors.warning,
                },
              ]}
            >
              <Text
                variant="caption"
                weight="extraBold"
                style={[styles.dateBadgeText, { color: colors.textInverse }]}
              >
                {text.badge.text}
              </Text>
            </View>
          )}
        </View>

        {/* Right Details Section */}
        <View style={styles.detailsContainer}>
          {/* Top Row: Date/Time + Bookmark Action */}
          <View style={styles.topRow}>
            <Text variant="footnote" tone="primary">
              {text.dateText}
            </Text>
            <View style={styles.actions}>
              {onNotInterested ? (
                <Pressable
                  onPress={notInterested}
                  hitSlop={ACTION_SLOP}
                  style={styles.action}
                  accessibilityRole="button"
                  accessibilityLabel={t('eventCard.notInterested', {
                    title: event.title,
                  })}
                >
                  <EyeOff
                    size={ACTION_ICON}
                    color={colors.textMuted}
                    strokeWidth={1.75}
                  />
                </Pressable>
              ) : null}
              <Pressable
                onPress={toggleSave}
                hitSlop={ACTION_SLOP}
                style={styles.action}
                accessibilityRole="button"
                accessibilityState={{ selected: isSaved }}
                accessibilityLabel={t(
                  isSaved ? 'eventCard.unsave' : 'eventCard.save',
                  { title: event.title },
                )}
              >
                <Pop active={isSaved}>
                  <Bookmark
                    size={ACTION_ICON}
                    color={isSaved ? colors.primary : colors.textMuted}
                    fill={isSaved ? colors.primary : 'none'}
                    strokeWidth={1.75}
                  />
                </Pop>
              </Pressable>
            </View>
          </View>

          {/* Event Title */}
          <Text variant="headline" accessibilityRole="header" numberOfLines={2}>
            {event.title}
          </Text>

          {/* Subtitle / Categories */}
          {event.primaryCategory && (
            <Text variant="footnote" tone="muted" numberOfLines={1}>
              {event.primaryCategory}
            </Text>
          )}

          {/* Location / Format */}
          <View style={styles.locationRow}>
            {event.format === 'virtual' ? (
              <Globe size={13} color={colors.textMuted} strokeWidth={2} />
            ) : (
              <MapPin size={13} color={colors.textMuted} strokeWidth={2} />
            )}
            <Text variant="footnote" tone="muted" numberOfLines={1}>
              {event.format === 'virtual'
                ? t('eventCard.online')
                : event.venueName
                  ? event.city
                    ? `${event.venueName}, ${event.city}`
                    : event.venueName
                  : (event.city ?? t('eventCard.venueTbc'))}
            </Text>
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
                <Text variant="footnote" tone="muted">
                  {event.distanceText}
                </Text>
              </View>
            )}

            <View
              style={[styles.chip, { backgroundColor: colors.primarySoft }]}
            >
              <Text variant="footnote" tone="primary">
                {text.priceLabel}
              </Text>
            </View>

            <View
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Text variant="footnote" tone="muted">
                {event.format === 'virtual'
                  ? t('eventCard.formatVirtual')
                  : event.format === 'hybrid'
                    ? t('eventCard.formatHybrid')
                    : t('eventCard.formatInPerson')}
              </Text>
            </View>
          </View>

          {reasonText ? (
            <Text
              variant="footnote"
              weight="bold"
              numberOfLines={2}
              style={{ color: colors.highlight }}
            >
              {reasonText}
            </Text>
          ) : null}

          {text.verificationText ? (
            <View style={styles.trustRow}>
              <VerifiedBadge state={event.verificationState} size={15} />
              <Text
                variant="footnote"
                tone={
                  event.verificationState === 'unreviewed' ? 'muted' : 'default'
                }
                style={
                  event.verificationState === 'unreviewed'
                    ? undefined
                    : { color: colors.success }
                }
              >
                {text.verificationText}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const ACTION_ICON = 18;
/** Icon plus padding plus slop reaches the minimum touch target. */
const ACTION_SLOP = (TouchTargets.minimum - ACTION_ICON - 2 * Spacing.xs) / 2;

const styles = StyleSheet.create({
  cardContent: {
    flexDirection: 'row',
    gap: Spacing.md,
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
    padding: Spacing.sm,
  },
  dateBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.sm,
  },
  dateBadgeText: {
    letterSpacing: 0.3,
  },
  detailsContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    // Wider than both slops together, so the touch areas never overlap.
    gap: Spacing.xxl,
  },
  action: {
    padding: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: 6,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
