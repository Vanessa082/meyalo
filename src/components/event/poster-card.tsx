import { useRouter } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { Pop, PressableScale } from '@/components/ui/motion';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { describeEventCard } from '@/services/event-mapping';
import { TouchTargets } from '@/theme';
import { Palette } from '@/theme/colors';
import type { EventCardData } from '@/types/event.type';
import { EventPoster, type PosterSize } from './event-poster';
import { useSaveToggle } from './use-save-toggle';

const ICON = 22;

interface PosterCardProps {
  event: EventCardData;
  size: Exclude<PosterSize, 'hero'>;
  width: number;
  /** Why it was picked, in the app language. */
  note?: string;
  /** Long press, or the screen-reader action, hides the event. */
  onNotInterested?: () => void;
}

/**
 * A poster that opens the event. One quiet save button in the corner;
 * "Not interested" is a long press (and a screen-reader action), so the
 * poster stays clean.
 */
export function PosterCard({
  event,
  size,
  width,
  note,
  onNotInterested,
}: PosterCardProps) {
  const router = useRouter();
  const colors = useTheme();
  const i18n = useTranslation();
  const { t } = i18n;
  const text = describeEventCard(event, i18n);
  const { isSaved, toggle } = useSaveToggle(event);
  const onPhoto = Boolean(event.coverImageUrl);
  const iconColor = onPhoto
    ? Palette.white
    : isSaved
      ? colors.primary
      : colors.textMuted;
  const place =
    event.format === 'virtual'
      ? t('eventCard.online')
      : (event.city ?? t('eventCard.venueTbc'));
  const notInterestedLabel = t('eventCard.notInterested', {
    title: event.title,
  });

  return (
    <PressableScale
      onPress={() => router.push(`/event/${event.id}`)}
      onLongPress={onNotInterested}
      accessibilityRole="link"
      accessibilityLabel={`${event.title}, ${text.dateText}, ${place}`}
      accessibilityActions={
        onNotInterested
          ? [{ name: 'notInterested', label: notInterestedLabel }]
          : undefined
      }
      onAccessibilityAction={(action) => {
        if (action.nativeEvent.actionName === 'notInterested') {
          onNotInterested?.();
        }
      }}
      style={{ width }}
    >
      <EventPoster
        event={event}
        size={size}
        meta={[event.primaryCategory, place, text.priceLabel]
          .filter(Boolean)
          .join(' · ')}
        note={note}
        corner={
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              toggle();
            }}
            hitSlop={(TouchTargets.minimum - ICON) / 2}
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved }}
            accessibilityLabel={t(
              isSaved ? 'eventCard.unsave' : 'eventCard.save',
              { title: event.title },
            )}
          >
            <Pop active={isSaved}>
              <Bookmark
                size={ICON}
                color={iconColor}
                fill={isSaved ? iconColor : 'none'}
                strokeWidth={1.8}
              />
            </Pop>
          </Pressable>
        }
      />
    </PressableScale>
  );
}
