import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ExploreFilters } from '@/components/explore/explore-filters';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EventCard } from '@/components/ui/event-card';
import { EventListSkeleton } from '@/components/ui/event-card-skeleton';
import { InlineMessage } from '@/components/ui/inline-message';
import { OfflineNotice } from '@/components/ui/offline-notice';
import { Page, PageHeader } from '@/components/ui/page';
import { SearchInput } from '@/components/ui/search-input';
import { SectionHeader } from '@/components/ui/section-header';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { TOPIC_IDS } from '@/config/discovery/topics';
import { REGION } from '@/config/region';
import { useExploreSearch } from '@/hooks/use-events';
import { translate } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import {
  activeFilterCount,
  EMPTY_EXPLORE,
  type ExploreState,
  MAX_QUERY_LENGTH,
  parseExploreParams,
  toExploreParams,
  topicsMatching,
  toSearchInput,
} from '@/services/explore-params';
import { Spacing } from '@/theme';

/** Every parameter Explore owns, so a change can also remove old ones. */
const PARAM_KEYS = [
  'q',
  'when',
  'city',
  'format',
  'free',
  'topic',
  'offer',
  'lang',
  'open',
  'sort',
] as const;

const SEARCH_DELAY_MS = 350;

/** Topic names in both app languages, so either finds the topic. */
const topicLabels = (id: (typeof TOPIC_IDS)[number]) => [
  translate(`topics.${id}`, undefined, 'en'),
  translate(`topics.${id}`, undefined, 'fr'),
];

export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const state = useMemo(() => parseExploreParams(params), [params]);

  // The page address is the only source of truth for search and filters.
  // `intended` runs ahead of it between a tap and the address updating, so
  // two quick taps both count.
  const intended = useRef(state);
  useEffect(() => {
    intended.current = state;
  }, [state]);
  const update = useCallback(
    (change: (previous: ExploreState) => ExploreState) => {
      const next = change(intended.current);
      intended.current = next;
      const cleared = Object.fromEntries(
        PARAM_KEYS.map((key) => [key, undefined]),
      );
      router.setParams({ ...cleared, ...toExploreParams(next) } as never);
    },
    [router],
  );

  // The box follows the address only when the address changed from outside
  // (Clear all, a shared link), never when it catches up with typing.
  const [text, setText] = useState(state.q);
  const pushed = useRef(state.q);
  useEffect(() => {
    if (state.q !== pushed.current) {
      pushed.current = state.q;
      setText(state.q);
    }
  }, [state.q]);
  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === state.q) return;
    const timer = setTimeout(() => {
      pushed.current = trimmed;
      update((previous) => ({ ...previous, q: trimmed }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, state, update]);

  // A new object each render is fine: queries are keyed by value.
  const input = toSearchInput(
    state,
    new Date(),
    REGION.timeZone,
    topicsMatching(state.q, topicLabels),
  );
  const results = useExploreSearch(
    input,
    state.sort === 'recent' ? 'created_desc' : 'start_asc',
  );
  const events = results.data?.pages.flatMap((page) => page.items) ?? [];
  const total = results.data?.pages[0]?.total;
  const browsing = !state.q && activeFilterCount(state) === 0;

  return (
    <Page>
      <PageHeader title={t('tabs.explore')} subtitle={t('explore.subtitle')} />

      <Stack gap="md">
        <SearchInput
          value={text}
          onChangeText={(value) => setText(value.slice(0, MAX_QUERY_LENGTH))}
          placeholder={t('explore.searchPlaceholder')}
          accessibilityLabel={t('explore.searchPlaceholder')}
          clearLabel={t('explore.clearSearch')}
        />
        <ExploreFilters state={state} onChange={update} />
      </Stack>

      {browsing ? (
        <Stack gap="sm">
          <SectionHeader title={t('explore.browseTopics')} />
          <Stack direction="row" gap="sm" wrap>
            {TOPIC_IDS.map((topic) => (
              <Chip
                key={topic}
                label={t(`topics.${topic}`)}
                selected={false}
                onPress={() =>
                  update((previous) => ({ ...previous, topics: [topic] }))
                }
              />
            ))}
          </Stack>
        </Stack>
      ) : null}

      <OfflineNotice updatedAt={results.dataUpdatedAt} />

      <Stack gap="md">
        {browsing ? <SectionHeader title={t('explore.comingUp')} /> : null}
        {results.isPending && results.fetchStatus !== 'paused' ? (
          <EventListSkeleton label={t('explore.loading')} />
        ) : results.isError && events.length === 0 ? (
          <InlineMessage
            tone="error"
            message={t('explore.loadError')}
            actionLabel={t('explore.retry')}
            onAction={() => results.refetch()}
          />
        ) : events.length === 0 && !results.isPending ? (
          <Stack gap="sm" align="center" style={styles.empty}>
            <Text variant="headline" accessibilityRole="header">
              {t('explore.emptyTitle')}
            </Text>
            <Text variant="callout" tone="muted" align="center">
              {t('explore.emptyBody')}
            </Text>
            {activeFilterCount(state) > 0 || state.q ? (
              <Button
                title={t('explore.clearAll')}
                variant="outline"
                size="small"
                onPress={() =>
                  update((previous) => ({ ...previous, ...emptyFilters }))
                }
              />
            ) : null}
          </Stack>
        ) : (
          <>
            {total !== undefined ? (
              <Text
                variant="footnote"
                tone="muted"
                accessibilityLiveRegion="polite"
              >
                {total === 1
                  ? t('explore.resultOne')
                  : t('explore.resultMany', { count: total })}
              </Text>
            ) : null}
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
            {results.isFetchNextPageError ? (
              <InlineMessage
                tone="error"
                message={t('explore.loadMoreFailed')}
                actionLabel={t('explore.retry')}
                onAction={() => results.fetchNextPage()}
              />
            ) : results.hasNextPage ? (
              <Button
                title={t('explore.loadMore')}
                variant="outline"
                loading={results.isFetchingNextPage}
                onPress={() => results.fetchNextPage()}
              />
            ) : null}
          </>
        )}
      </Stack>
    </Page>
  );
}

/** "Clear all" from the empty state clears the words and every filter, and
 *  keeps the sort. Derived, so a new filter is cleared without a change here. */
const { sort: _keepSort, ...emptyFilters } = EMPTY_EXPLORE;

const styles = StyleSheet.create({
  empty: {
    paddingVertical: Spacing.xxxl,
  },
});
