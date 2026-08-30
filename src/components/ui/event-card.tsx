import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { EventCardData } from '@/types/event.type';
import { ThemeText } from './theme-text';

type EventCardProps = {
  event: EventCardData;
  onPress?: () => void;
  showCategory?: boolean;
};

export function EventCard({
  event,
  onPress,
  showCategory = true,
}: EventCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.borderSubtle,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {showCategory && (
        <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
          <ThemeText variant="caption" style={{ color: theme.primary }}>
            {event.primaryCategory}
          </ThemeText>
        </View>
      )}

      {/* Title */}
      <ThemeText variant="title" numberOfLines={2} style={styles.title}>
        {event.title}
      </ThemeText>

      {/* Organizer */}
      <ThemeText variant="caption" style={styles.organizer}>
        {event.organizerName}
      </ThemeText>

      {/* Meta Row: Date & Location */}
      <View style={styles.metaRow}>
        <ThemeText variant="caption">{event.startsAt}</ThemeText>
        {event.city && (
          <>
            <ThemeText variant="caption"> • </ThemeText>
            <ThemeText variant="caption">{event.city}</ThemeText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  title: {
    marginBottom: 4,
  },
  organizer: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
