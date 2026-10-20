import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { formatDayHeading, weekdayInitials } from '@/i18n/format';
import { useTranslation } from '@/i18n/locale-provider';
import type { CalendarDay } from '@/services/month-plan';
import { Radius, Spacing, TouchTargets } from '@/theme';

interface MonthCalendarProps {
  title: string;
  weeks: CalendarDay[][];
  selected: string | null;
  onSelect: (date: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

/** Compact month grid: today ringed, a dot under planned days, the selected
 *  day filled. Weeks start on Monday. */
export function MonthCalendar({
  title,
  weeks,
  selected,
  onSelect,
  onPrevious,
  onNext,
}: MonthCalendarProps) {
  const colors = useTheme();
  const { t, language } = useTranslation();

  const arrow = (label: string, onPress: () => void, next: boolean) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.arrow}
    >
      {next ? (
        <ChevronRight size={22} color={colors.text} />
      ) : (
        <ChevronLeft size={22} color={colors.text} />
      )}
    </Pressable>
  );

  return (
    <Stack gap="sm">
      <Stack direction="row" align="center" justify="space-between">
        {arrow(t('month.previousMonth'), onPrevious, false)}
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        {arrow(t('month.nextMonth'), onNext, true)}
      </Stack>

      <View style={styles.row}>
        {weekdayInitials(language).map((initial, index) => (
          <Text
            // Fixed seven columns; two weekdays can share an initial.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            key={index}
            variant="caption"
            tone="muted"
            align="center"
            style={styles.cell}
          >
            {initial}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0].date} style={styles.row}>
          {week.map((day) => {
            const isSelected = day.date === selected;
            const label = formatDayHeading(day.date, language);
            return (
              <Pressable
                key={day.date}
                onPress={() => onSelect(day.date)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={
                  day.marked ? t('month.dayWithPlans', { date: label }) : label
                }
                style={[styles.cell, styles.day]}
              >
                <View
                  style={[
                    styles.number,
                    isSelected && { backgroundColor: colors.primary },
                    day.isToday &&
                      !isSelected && {
                        borderWidth: 1,
                        borderColor: colors.primary,
                      },
                  ]}
                >
                  <Text
                    variant="callout"
                    weight={day.isToday ? 'bold' : undefined}
                    style={{
                      color: isSelected
                        ? colors.onPrimary
                        : day.inMonth
                          ? colors.text
                          : colors.textMuted,
                    }}
                  >
                    {Number(day.date.slice(8))}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: day.marked
                        ? colors.primary
                        : 'transparent',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </Stack>
  );
}

const NUMBER = 34;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
  },
  day: {
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: TouchTargets.minimum,
  },
  number: {
    width: NUMBER,
    height: NUMBER,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: Spacing.xs,
    height: Spacing.xs,
    borderRadius: Radius.full,
  },
  arrow: {
    width: TouchTargets.minimum,
    height: TouchTargets.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
