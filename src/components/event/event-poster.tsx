import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { buildDateBadge, dateParts } from '@/services/event-mapping';
import { Radius, Spacing } from '@/theme';
import { Palette } from '@/theme/colors';
import type { EventCardData } from '@/types/event.type';

export type PosterSize = 'feature' | 'rail' | 'hero';

/** Shorter without photos: the date is one line, not a picture. */
const SIZES = {
  feature: {
    height: 220,
    photoHeight: 300,
    title: 'title2',
    padding: Spacing.lg,
  },
  rail: {
    height: 170,
    photoHeight: 200,
    title: 'headline',
    padding: Spacing.md,
  },
  hero: { height: 220, photoHeight: 300, title: 'title1', padding: Spacing.xl },
} as const;

/** Readable white text over any photo. */
const PHOTO_SCRIM = 'rgba(17, 19, 18, 0.55)';

interface EventPosterProps {
  event: EventCardData;
  size: PosterSize;
  /** One line under the title, e.g. "Workshop · Akwa · Free". */
  meta?: string;
  /** Why it was picked, in the app language. */
  note?: string;
  /** Corner content such as the save button. */
  corner?: React.ReactNode;
  /** The hero sits at the top edge of the screen, without rounded corners. */
  square?: boolean;
  /** The title is the page heading (event page). */
  asHeading?: boolean;
}

/**
 * The event's own image when we may use it; otherwise a clean card. Top: the
 * date on one line in the brand colour, then the title, so titles start at
 * the same height on every card in a row. Bottom: the details. Black, white
 * and one brand colour (BRAND.md).
 */
export function EventPoster({
  event,
  size,
  meta,
  note,
  corner,
  square = false,
  asHeading = false,
}: EventPosterProps) {
  const colors = useTheme();
  const i18n = useTranslation();
  const spec = SIZES[size];
  // The event page shows the large file; cards the small one.
  const photo =
    size === 'hero'
      ? (event.coverImageLargeUrl ?? event.coverImageUrl)
      : event.coverImageUrl;
  const date = dateParts(event.startsAt, event.timezone || null, i18n);
  const badge = buildDateBadge(event.startsAt, event.timezone || null, i18n);
  const dateLine =
    badge && badge.kind !== 'date'
      ? badge.text.toLocaleUpperCase()
      : `${date.weekday} ${date.day} ${date.month}`;
  const tone = photo
    ? {
        date: Palette.white,
        title: Palette.white,
        muted: Palette.canvas,
        note: Palette.white,
      }
    : {
        date: colors.primary,
        title: colors.text,
        muted: colors.textMuted,
        note: colors.highlight,
      };

  return (
    <View
      style={[
        styles.poster,
        {
          height: photo ? spec.photoHeight : spec.height,
          padding: spec.padding,
          backgroundColor: photo ? Palette.ink : colors.surface,
          borderColor: colors.border,
          borderWidth: photo || square ? 0 : StyleSheet.hairlineWidth,
          borderRadius: square ? 0 : Radius.lg,
        },
      ]}
    >
      {photo ? (
        <>
          <Image
            source={{ uri: photo }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={{
              duration: 200,
              effect: 'cross-dissolve',
              timing: 'ease-out',
            }}
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
            accessible
            accessibilityLabel={event.coverImageAlt}
          />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: PHOTO_SCRIM }]}
          />
        </>
      ) : null}

      <View style={styles.top}>
        <View style={styles.dateRow}>
          <Text
            variant="caption"
            weight="extraBold"
            numberOfLines={1}
            style={[styles.date, { color: tone.date }]}
          >
            {dateLine}
          </Text>
          {corner}
        </View>
        <Text
          variant={spec.title}
          weight="extraBold"
          numberOfLines={3}
          accessibilityRole={asHeading ? 'header' : undefined}
          style={{ color: tone.title }}
        >
          {event.title}
        </Text>
      </View>

      <View style={styles.bottom}>
        {note ? (
          <Text
            variant="footnote"
            weight="bold"
            numberOfLines={2}
            style={{ color: tone.note }}
          >
            {note}
          </Text>
        ) : null}
        {meta ? (
          <Text
            variant="footnote"
            numberOfLines={1}
            style={{ color: tone.muted }}
          >
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  top: {
    gap: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: Spacing.xxl,
  },
  date: {
    flex: 1,
    letterSpacing: 0.8,
  },
  bottom: {
    gap: Spacing.xs,
  },
});
