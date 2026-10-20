import { useRouter } from 'expo-router';
import { Bookmark, Compass } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { DidYouGo } from '@/components/event/did-you-go';
import { MonthCalendar } from '@/components/month/month-calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EventCard } from '@/components/ui/event-card';
import { IconCircle } from '@/components/ui/icon-circle';
import { InlineMessage } from '@/components/ui/inline-message';
import { Page, PageHeader } from '@/components/ui/page';
import { SectionHeader } from '@/components/ui/section-header';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { REGION } from '@/config/region';
import { useDiscoveryProfile } from '@/hooks/use-discovery-profile';
import { useForYouEvents } from '@/hooks/use-events';
import { useSavedEvents, useSetRegistered } from '@/hooks/use-saved-events';
import { useTheme } from '@/hooks/use-theme';
import { formatDayHeading, formatMonthYear } from '@/i18n/format';
import { useTranslation } from '@/i18n/locale-provider';
import { formatEventDate } from '@/services/event-mapping';
import {
  type AgendaItem,
  buildMonthPlan,
  countEventsByDay,
  type PlannedEvent,
  planChange,
} from '@/services/month-plan';
import { buildForYouFeed } from '@/services/ranking.service';
import { zonedDay } from '@/services/zoned-time';
import { Spacing } from '@/theme';

/** The calendar month containing `now`, in the region's timezone. */
function currentMonth(now: Date): { year: number; month: number } {
  const today = zonedDay(now.toISOString(), REGION.timeZone);
  const date = new Date(today?.date ?? now.getTime());
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function shiftMonth(
  { year, month }: { year: number; month: number },
  by: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * My Month (docs/product-decisions.md, "Spec: My Month and plan states"):
 * a calendar, the month's agenda by day, Considering and Past.
 */
export default function MonthScreen() {
  const colors = useTheme();
  const router = useRouter();
  const i18n = useTranslation();
  const { t, language } = i18n;
  const toast = useToast();
  const { data: events = [] } = useForYouEvents();
  const { data: profile = null } = useDiscoveryProfile();
  const {
    data: saved = [],
    isPending: isLoading,
    isError: savedError,
  } = useSavedEvents();
  const setRegistered = useSetRegistered();
  const [month, setMonth] = useState(() => currentMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  // The live event when known (fresh details, cancellations); otherwise the
  // copy saved with the plan, so the month works offline and after
  // unpublishing.
  const live = new Map(events.map((event) => [event.id, event]));
  const planned: PlannedEvent[] = [];
  let unavailable = 0;
  for (const entry of saved) {
    const current = live.get(entry.id);
    const event = current ?? entry.snapshot;
    if (!event) {
      unavailable += 1;
      continue;
    }
    planned.push({
      event,
      plan: entry.plan,
      registered: entry.registered,
      change: entry.snapshot ? planChange(entry.snapshot, current) : null,
    });
  }

  const now = new Date();
  const feed = buildForYouFeed(events, profile, now);
  const matches = countEventsByDay(
    [...feed.topPicks.map((pick) => pick.event), ...feed.moreUpcoming],
    REGION.timeZone,
  );
  const plan = buildMonthPlan(planned, month, now, REGION.timeZone, matches);
  const days = selected
    ? plan.days.filter((day) => day.date === selected)
    : plan.days;

  const tickRegistered = (id: string, registered: boolean) =>
    setRegistered.mutate(
      { id, registered },
      {
        onError: () =>
          toast.show({ tone: 'error', message: t('eventCard.saveFailed') }),
      },
    );

  const registeredChip = (p: PlannedEvent) => (
    <Chip
      label={t('month.registered')}
      selected={p.registered}
      onPress={() => tickRegistered(p.event.id, !p.registered)}
    />
  );

  const item = (entry: AgendaItem, index: number) => {
    switch (entry.kind) {
      case 'event': {
        const p = entry.planned;
        return (
          <Stack key={`e-${p.event.id}`} gap="sm">
            <EventCard event={p.event} />
            {p.change ? (
              <InlineMessage
                tone={p.change === 'cancelled' ? 'error' : 'warning'}
                message={
                  p.change === 'cancelled'
                    ? t('month.cancelled')
                    : t('month.changed')
                }
              />
            ) : null}
            {entry.warnings.map((warning) => (
              <InlineMessage
                key={`${warning.kind}-${warning.with}`}
                tone="warning"
                message={t(
                  warning.kind === 'clash' ? 'month.clash' : 'month.travel',
                  { title: warning.with },
                )}
              />
            ))}
            <Stack direction="row">{registeredChip(p)}</Stack>
          </Stack>
        );
      }
      case 'deadline': {
        const p = entry.planned;
        return (
          <Card
            key={`d-${p.event.id}`}
            variant="outlined"
            padding="md"
            onPress={() => router.push(`/event/${p.event.id}`)}
          >
            <Stack gap="sm">
              <Text variant="headline">
                {t('month.registrationCloses', { title: p.event.title })}
              </Text>
              {p.event.registrationDeadline ? (
                <Text variant="footnote" tone="muted">
                  {formatEventDate(
                    p.event.registrationDeadline,
                    p.event.timezone || null,
                    i18n,
                  )}
                </Text>
              ) : null}
              <Stack direction="row">{registeredChip(p)}</Stack>
            </Stack>
          </Card>
        );
      }
      case 'free':
        return (
          <Card
            key={`f-${index}`}
            variant="flat"
            padding="md"
            style={{ backgroundColor: colors.primarySoft }}
          >
            <Stack direction="row" gap="md" align="center">
              <Text variant="callout" style={styles.fill}>
                {t(
                  entry.weekday === 'saturday'
                    ? 'month.freeSaturday'
                    : 'month.freeSunday',
                  { count: entry.count },
                )}
              </Text>
              <Button
                title={t('month.see')}
                variant="ghost"
                size="small"
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/explore',
                    params: { when: 'weekend' },
                  })
                }
              />
            </Stack>
          </Card>
        );
    }
  };

  const eventList = (list: PlannedEvent[]) =>
    list.map((p) => <EventCard key={p.event.id} event={p.event} />);

  // Past events keep their "Did you go?" answer and note.
  const entries = new Map(saved.map((entry) => [entry.id, entry]));
  const pastList = (list: PlannedEvent[]) =>
    list.map((p) => {
      const entry = entries.get(p.event.id);
      return (
        <Stack key={p.event.id} gap="sm">
          <EventCard event={p.event} />
          {entry ? <DidYouGo entry={entry} title={p.event.title} /> : null}
        </Stack>
      );
    });

  return (
    <Page>
      <PageHeader title={t('tabs.month')} subtitle={t('month.subtitle')} />

      {savedError ? (
        <InlineMessage tone="error" message={t('month.loadError')} />
      ) : isLoading ? (
        <Text variant="callout" tone="muted">
          {t('month.loading')}
        </Text>
      ) : saved.length === 0 ? (
        <Card
          variant="outlined"
          padding="lg"
          style={{ backgroundColor: colors.surface }}
        >
          <Stack gap="md" align="center" style={styles.empty}>
            <IconCircle icon={Bookmark} size="lg" />
            <Text variant="headline" accessibilityRole="header" align="center">
              {t('month.noSavedTitle')}
            </Text>
            <Text variant="callout" tone="muted" align="center">
              {t('month.noSavedBody')}
            </Text>
            <Button
              title={t('month.exploreButton')}
              variant="primary"
              size="medium"
              icon={<Compass size={16} color={colors.onPrimary} />}
              onPress={() => router.push('/(tabs)/explore')}
            />
          </Stack>
        </Card>
      ) : (
        <>
          <Card variant="outlined" padding="md">
            <MonthCalendar
              title={formatMonthYear(
                new Date(Date.UTC(month.year, month.month - 1, 15)),
                language,
              )}
              weeks={plan.weeks}
              selected={selected}
              onSelect={(date) =>
                setSelected((current) => (current === date ? null : date))
              }
              onPrevious={() => {
                setSelected(null);
                setMonth((m) => shiftMonth(m, -1));
              }}
              onNext={() => {
                setSelected(null);
                setMonth((m) => shiftMonth(m, 1));
              }}
            />
          </Card>

          {unavailable > 0 ? (
            <InlineMessage
              tone="info"
              message={t('month.unavailable', { count: unavailable })}
            />
          ) : null}

          {selected ? (
            <Button
              title={t('month.showMonth')}
              variant="ghost"
              size="small"
              onPress={() => setSelected(null)}
            />
          ) : null}

          {days.length > 0 ? (
            days.map((day) => (
              <Stack key={day.date} gap="md">
                <SectionHeader title={formatDayHeading(day.date, language)} />
                {day.items.map(item)}
              </Stack>
            ))
          ) : (
            <Text variant="callout" tone="muted">
              {selected
                ? t('month.nothingThisDay')
                : t('month.nothingThisMonth')}
            </Text>
          )}

          {plan.considering.length > 0 ? (
            <Stack gap="md">
              <SectionHeader title={t('month.considering')} />
              {eventList(plan.considering)}
            </Stack>
          ) : null}

          {plan.past.length > 0 ? (
            <Stack gap="md">
              <Button
                title={
                  showPast
                    ? t('month.hidePast')
                    : t('month.past', { count: plan.past.length })
                }
                variant="ghost"
                size="small"
                onPress={() => setShowPast((open) => !open)}
              />
              {showPast ? pastList(plan.past) : null}
            </Stack>
          ) : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  empty: {
    paddingVertical: Spacing.lg,
  },
});
