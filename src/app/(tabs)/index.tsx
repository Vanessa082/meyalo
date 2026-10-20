import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { PosterCard } from '@/components/event/poster-card';
import { ForYouGreeting } from '@/components/for-you/for-you-greeting';
import { HiddenEventPanel } from '@/components/for-you/hidden-event-panel';
import { QuickFilterBar } from '@/components/for-you/quick-filter-bar';
import { EventCard } from '@/components/ui/event-card';
import { EventListSkeleton } from '@/components/ui/event-card-skeleton';
import { InlineMessage } from '@/components/ui/inline-message';
import { Entrance } from '@/components/ui/motion';
import { OfflineNotice } from '@/components/ui/offline-notice';
import { Page } from '@/components/ui/page';
import { PersonalizeBanner } from '@/components/ui/personalize-banner';
import { Rail } from '@/components/ui/rail';
import { SectionHeader } from '@/components/ui/section-header';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useDiscoveryProfile } from '@/hooks/use-discovery-profile';
import { useForYouEvents } from '@/hooks/use-events';
import {
  useFeedSignals,
  useHiddenEvents,
  useHideEvent,
  useRestoreEvent,
  useSetHiddenReason,
} from '@/hooks/use-hidden-events';
import { useValueAtFocus } from '@/hooks/use-value-at-focus';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import { buildForYouLayout } from '@/services/for-you-rails';
import type { HiddenReason } from '@/services/hidden-events-store';
import {
  matchesQuickFilters,
  type QuickFilter,
} from '@/services/quick-filters';
import { buildForYouFeed, type MatchReason } from '@/services/ranking.service';
import type { EventCardData } from '@/types/event.type';

/** Rail posters: about two and a half visible on a phone, hinting at more. */
const RAIL_WIDTH = 156;
const FEATURE_MAX_WIDTH = 320;

export default function ForYouScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  // Most of the screen, so the next poster peeks in from the edge.
  const featureWidth = Math.min(
    Math.round(screenWidth * 0.78),
    FEATURE_MAX_WIDTH,
  );
  const {
    data: events = [],
    isPending,
    isError,
    refetch,
    fetchStatus,
    dataUpdatedAt,
  } = useForYouEvents();
  const { data: profile = null } = useDiscoveryProfile();
  const toast = useToast();

  const [filters, setFilters] = useState<QuickFilter[]>([]);

  // Events hidden during this visit stay in place as a panel with Undo and
  // the reasons, and the order is the one from when the screen opened, so
  // nothing moves under the user's finger. Both reset when they leave.
  const [hiddenNow, setHiddenNow] = useState<string[]>([]);
  useFocusEffect(useCallback(() => () => setHiddenNow([]), []));
  const signals = useFeedSignals();
  const affinity = useValueAtFocus(signals.affinity);
  const { data: hiddenEntries = [] } = useHiddenEvents();
  const hide = useHideEvent();
  const restore = useRestoreEvent();
  const setReason = useSetHiddenReason();

  const now = new Date();
  const feed = buildForYouFeed(
    filters.length > 0
      ? events.filter((event) => matchesQuickFilters(event, filters, now))
      : events,
    profile,
    now,
    {
      hiddenIds: new Set(
        [...signals.hiddenIds].filter((id) => !hiddenNow.includes(id)),
      ),
      affinity,
    },
  );

  const forget = (id: string) =>
    setHiddenNow((ids) => ids.filter((item) => item !== id));

  const hideEvent = (event: EventCardData) => {
    setHiddenNow((ids) => [...ids, event.id]);
    hide.mutate(event, {
      onError: () => {
        forget(event.id);
        toast.show({
          tone: 'error',
          message: t('notInterested.hideFailed'),
          actionLabel: t('notInterested.retry'),
          onAction: () => hideEvent(event),
        });
      },
    });
  };

  const undoHide = (event: EventCardData) =>
    restore.mutate(event.id, {
      onSuccess: () => forget(event.id),
      onError: () =>
        toast.show({ tone: 'error', message: t('notInterested.undoFailed') }),
    });

  const chooseReason = (id: string, reason: HiddenReason | null) =>
    setReason.mutate(
      { id, reason },
      {
        onError: () =>
          toast.show({
            tone: 'error',
            message: t('notInterested.reasonFailed'),
          }),
      },
    );
  const area =
    profile?.area?.kind === 'city'
      ? { kind: 'city' as const, name: profile.area.city.name }
      : profile?.area?.kind === 'online_only'
        ? { kind: 'online_only' as const }
        : null;
  const cityName = area?.kind === 'city' ? area.name : null;
  const personalize = () => router.push('/(onboarding)/location');
  const openExplore = () => router.push('/(tabs)/explore');

  const reasonText = (reasons: MatchReason[]) =>
    t('forYou.why', {
      reasons: reasons
        .map((reason) =>
          reason.kind === 'topic'
            ? t(`topics.${reason.topicId}` as TxKeyPath)
            : reason.kind === 'goal'
              ? t(`goals.${reason.goalId}` as TxKeyPath)
              : reason.kind === 'deadline'
                ? t('forYou.reasonDeadline')
                : reason.kind === 'habit'
                  ? t('forYou.reasonHabit')
                  : t('forYou.reasonSoon'),
        )
        .join(' · '),
    });

  const withDistance = (event: EventCardData): EventCardData =>
    event.distanceKm == null
      ? event
      : {
          ...event,
          distanceText: t('forYou.distance', {
            km: Math.max(1, Math.round(event.distanceKm)),
          }),
        };

  const nothingLocal =
    feed.topPicks.length === 0 && feed.moreUpcoming.length === 0;
  // With chips on, an empty section is the chips' doing, not a weak match.
  const fewMatches =
    filters.length === 0 && feed.personalized && feed.topPicks.length === 0;
  const nothingAtAll = nothingLocal && feed.beyondCity.length === 0;

  const hiddenPanel = (event: EventCardData) => (
    <HiddenEventPanel
      key={event.id}
      title={event.title}
      reason={
        hiddenEntries.find((entry) => entry.id === event.id)?.reason ?? null
      }
      onUndo={() => undoHide(event)}
      onReason={(reason) => chooseReason(event.id, reason)}
    />
  );

  /** A list card that rises in with the first screenful. */
  const card = (event: EventCardData, index: number) => (
    <Entrance key={event.id} index={index}>
      {hiddenNow.includes(event.id) ? (
        hiddenPanel(event)
      ) : (
        <EventCard event={event} onNotInterested={() => hideEvent(event)} />
      )}
    </Entrance>
  );

  /** A poster in a carousel or rail; a hidden one keeps its slot. */
  const poster = (
    event: EventCardData,
    index: number,
    size: 'feature' | 'rail',
    note?: string,
  ) => {
    const width = size === 'feature' ? featureWidth : RAIL_WIDTH;
    return (
      <Entrance key={event.id} index={index} style={{ width }}>
        {hiddenNow.includes(event.id) ? (
          hiddenPanel(event)
        ) : (
          <PosterCard
            event={event}
            size={size}
            width={width}
            note={note}
            onNotInterested={() => hideEvent(event)}
          />
        )}
      </Entrance>
    );
  };

  const layout = buildForYouLayout(
    feed,
    profile?.interestIds ?? [],
    new Date(),
  );
  const carouselTitle = feed.personalized
    ? t('forYou.topPicks')
    : cityName
      ? t('forYou.thisWeekIn', { city: cityName })
      : t('forYou.thisWeek');

  const listSection = (
    title: string,
    events: EventCardData[],
    options: {
      hint?: string;
      action?: { text: string; onPress: () => void };
    } = {},
  ) => (
    <Stack gap="md">
      <SectionHeader
        title={title}
        actionText={options.action?.text}
        onPressAction={options.action?.onPress}
      />
      {options.hint ? (
        <Text variant="footnote" tone="muted">
          {options.hint}
        </Text>
      ) : null}
      {events.map(card)}
    </Stack>
  );

  return (
    <Page>
      <ForYouGreeting area={area} onPressLocation={personalize} />

      {!feed.personalized ? (
        <PersonalizeBanner onPersonalize={personalize} />
      ) : null}

      <OfflineNotice updatedAt={dataUpdatedAt} />

      {isPending && fetchStatus === 'paused' ? null : isPending ? (
        <EventListSkeleton label={t('forYou.loading')} />
      ) : isError ? (
        <InlineMessage
          tone="error"
          message={t('forYou.loadError')}
          actionLabel={t('forYou.retry')}
          onAction={() => refetch()}
        />
      ) : (
        <>
          <QuickFilterBar selected={filters} onChange={setFilters} />

          {/* A format preference hides events; say so, with a way back. */}
          {profile?.format === 'online' || profile?.format === 'in_person' ? (
            <InlineMessage
              tone="info"
              message={
                profile.format === 'online'
                  ? t('forYou.onlyOnline')
                  : t('forYou.onlyInPerson')
              }
              actionLabel={t('forYou.changeFormat')}
              onAction={personalize}
            />
          ) : null}

          {signals.isError ? (
            <InlineMessage
              tone="warning"
              message={t('forYou.hiddenReadError')}
            />
          ) : null}

          {layout.carousel.length > 0 ? (
            <Rail title={carouselTitle} snapWidth={featureWidth}>
              {layout.carousel.map(({ event, reasons }, index) =>
                poster(
                  event,
                  index,
                  'feature',
                  reasons.length > 0 ? reasonText(reasons) : undefined,
                ),
              )}
            </Rail>
          ) : null}

          {fewMatches ? (
            <InlineMessage
              tone="info"
              message={
                cityName
                  ? t('forYou.fewMatches', { city: cityName })
                  : t('forYou.fewMatchesNoCity')
              }
            />
          ) : null}

          {layout.rails.map((rail) => (
            <Rail
              key={rail.kind === 'topic' ? rail.topicId : rail.kind}
              title={
                rail.kind === 'topic'
                  ? t(`topics.${rail.topicId}` as TxKeyPath)
                  : t('forYou.closingSoon')
              }
              actionText={
                rail.kind === 'topic' ? t('forYou.seeAll') : undefined
              }
              onPressAction={
                rail.kind === 'topic'
                  ? () =>
                      router.push({
                        pathname: '/(tabs)/explore',
                        params: { topic: rail.topicId },
                      })
                  : undefined
              }
              snapWidth={RAIL_WIDTH}
            >
              {rail.events.map((event, index) => poster(event, index, 'rail'))}
            </Rail>
          ))}

          {layout.rest.length > 0
            ? listSection(
                feed.personalized
                  ? t('forYou.moreUpcoming')
                  : t('forYou.upcoming'),
                layout.rest,
                { action: { text: t('forYou.seeAll'), onPress: openExplore } },
              )
            : null}

          {feed.beyondCity.length > 0 && cityName
            ? listSection(
                t('forYou.beyondCity', { city: cityName }),
                feed.beyondCity.map(withDistance),
                { hint: t('forYou.beyondCityHint') },
              )
            : null}

          {nothingAtAll && filters.length > 0 ? (
            <InlineMessage
              tone="info"
              message={t('forYou.filtersEmpty')}
              actionLabel={t('forYou.clearFilters')}
              onAction={() => setFilters([])}
            />
          ) : nothingAtAll ? (
            <Text variant="callout" tone="muted">
              {t('forYou.empty')}
            </Text>
          ) : null}
        </>
      )}
    </Page>
  );
}
