import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import {
  Banner,
  Choices,
  describeError,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
} from '@/components/console/console-ui';
import {
  EventStatusBadges,
  eventTime,
} from '@/components/console/event-status';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCurationEvents } from '@/hooks/use-curation';
import { useTheme } from '@/hooks/use-theme';
import {
  EVENT_FORMATS,
  FORMAT_LABELS,
  PUBLICATION_LABELS,
  PUBLICATION_STATUSES,
  VERIFICATION_LABELS,
  VERIFICATION_STATES,
} from '@/services/event-domain';
import { DAY_MS } from '@/services/zoned-time';
import type {
  Event,
  EventFilters,
  EventFormat,
  EventSort,
  PublicationStatus,
  VerificationState,
} from '@/types/event.type';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface FilterDraft {
  search: string;
  publicationStatuses: PublicationStatus[];
  verificationStates: VerificationState[];
  formats: EventFormat[];
  category: string;
  city: string;
  countryCode: string;
  from: string;
  to: string;
}

const EMPTY_DRAFT: FilterDraft = {
  search: '',
  publicationStatuses: [],
  verificationStates: [],
  formats: [],
  category: '',
  city: '',
  countryCode: '',
  from: '',
  to: '',
};

type ListView =
  | 'all'
  | 'needs_review'
  | 'under_review'
  | 'recheck'
  | 'stale'
  | 'unpinned';

const SORTS: { value: EventSort; label: string }[] = [
  { value: 'start_asc', label: 'Soonest first' },
  { value: 'start_desc', label: 'Latest first' },
  { value: 'updated_desc', label: 'Recently edited' },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function draftToFilters(
  draft: FilterDraft,
  view: ListView,
  now: number,
): { filters: EventFilters; errors: Partial<Record<'from' | 'to', string>> } {
  const errors: Partial<Record<'from' | 'to', string>> = {};
  const day = (value: string, key: 'from' | 'to', offsetDays: number) => {
    if (!value.trim()) return undefined;
    const ms = Date.parse(`${value.trim()}T00:00:00Z`);
    if (!DATE.test(value.trim()) || !Number.isFinite(ms)) {
      errors[key] = 'Use YYYY-MM-DD.';
      return undefined;
    }
    return new Date(ms + offsetDays * DAY_MS).toISOString();
  };

  const filters: EventFilters = {
    search: draft.search || undefined,
    publicationStatuses: draft.publicationStatuses,
    verificationStates: draft.verificationStates,
    formats: draft.formats,
    category: draft.category || undefined,
    city: draft.city || undefined,
    countryCode: draft.countryCode || undefined,
    startsFrom: day(draft.from, 'from', 0),
    startsBefore: day(draft.to, 'to', 1),
  };

  const today = new Date(now).toISOString();
  if (view === 'needs_review') {
    filters.verificationStates = ['unreviewed'];
  } else if (view === 'under_review') {
    filters.publicationStatuses = ['under_review'];
  } else if (view === 'recheck') {
    filters.publicationStatuses = ['published'];
    filters.startsFrom = today;
    filters.startsBefore = new Date(now + 7 * DAY_MS).toISOString();
  } else if (view === 'stale') {
    filters.publicationStatuses = ['published'];
    filters.startsFrom = today;
    filters.lastCheckedBefore = new Date(now - 14 * DAY_MS).toISOString();
  } else if (view === 'unpinned') {
    filters.publicationStatuses = ['published'];
    filters.formats = ['in_person', 'hybrid'];
    filters.startsFrom = today;
    filters.notPinned = true;
  }
  return { filters, errors };
}

export default function CurationListScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [draft, setDraft] = useState<FilterDraft>(EMPTY_DRAFT);
  const [applied, setApplied] = useState<FilterDraft>(EMPTY_DRAFT);
  const [view, setView] = useState<ListView>('all');
  const [sort, setSort] = useState<EventSort>('start_asc');
  const [now] = useState(() => Date.now());

  const { filters, errors } = useMemo(
    () => draftToFilters(applied, view, now),
    [applied, view, now],
  );
  const query = useCurationEvents(filters, sort);
  const events = query.data?.pages.flatMap((page) => page.items) ?? [];

  const setField = (field: keyof FilterDraft) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text variant="title2" accessibilityRole="header">
          Events
        </Text>
        <View style={styles.headerActions}>
          <Button
            title="Submissions"
            variant="outline"
            size="small"
            onPress={() => router.push('/console/submissions')}
          />
          <Button
            title="Coverage"
            variant="outline"
            size="small"
            onPress={() => router.push('/console/coverage')}
          />
          <Button
            title="New event"
            size="small"
            onPress={() => router.push('/console/new')}
          />
        </View>
      </View>

      <Choices
        label="View"
        options={[
          { value: 'all', label: 'All events' },
          { value: 'needs_review', label: 'Needs review' },
          {
            value: 'under_review',
            label: 'Taken down for review (reports, rejections)',
          },
          { value: 'recheck', label: 'Published, starting within 7 days' },
          { value: 'stale', label: 'Published, check 14+ days old' },
          { value: 'unpinned', label: 'Published, not on the map' },
        ]}
        selected={[view]}
        onToggle={(value) => setView(value)}
      />

      <Field
        label="Search"
        placeholder="Title, organizer, venue or city"
        value={draft.search}
        onChangeText={setField('search')}
        onSubmitEditing={() => setApplied(draft)}
      />
      <Choices
        label="Publication"
        options={PUBLICATION_STATUSES.map((value) => ({
          value,
          label: PUBLICATION_LABELS[value],
        }))}
        selected={draft.publicationStatuses}
        onToggle={(value) =>
          setDraft((current) => ({
            ...current,
            publicationStatuses: toggle(current.publicationStatuses, value),
          }))
        }
      />
      <Choices
        label="Verification"
        options={VERIFICATION_STATES.map((value) => ({
          value,
          label: VERIFICATION_LABELS[value],
        }))}
        selected={draft.verificationStates}
        onToggle={(value) =>
          setDraft((current) => ({
            ...current,
            verificationStates: toggle(current.verificationStates, value),
          }))
        }
      />
      <Choices
        label="Format"
        options={EVENT_FORMATS.map((value) => ({
          value,
          label: FORMAT_LABELS[value],
        }))}
        selected={draft.formats}
        onToggle={(value) =>
          setDraft((current) => ({
            ...current,
            formats: toggle(current.formats, value),
          }))
        }
      />
      <View style={styles.filterGrid}>
        <View style={styles.filterCell}>
          <Field
            label="Category (exact)"
            value={draft.category}
            onChangeText={setField('category')}
            autoCapitalize="sentences"
          />
        </View>
        <View style={styles.filterCell}>
          <Field
            label="City"
            value={draft.city}
            onChangeText={setField('city')}
          />
        </View>
        <View style={styles.filterCell}>
          <Field
            label="Country code"
            value={draft.countryCode}
            onChangeText={setField('countryCode')}
            autoCapitalize="characters"
          />
        </View>
        <View style={styles.filterCell}>
          <Field
            label="Starts from (UTC day)"
            placeholder="YYYY-MM-DD"
            value={draft.from}
            onChangeText={setField('from')}
            error={errors.from}
          />
        </View>
        <View style={styles.filterCell}>
          <Field
            label="Starts until (UTC day)"
            placeholder="YYYY-MM-DD"
            value={draft.to}
            onChangeText={setField('to')}
            error={errors.to}
          />
        </View>
      </View>
      <View style={styles.titleRow}>
        <Button
          title="Apply filters"
          size="small"
          onPress={() => setApplied(draft)}
        />
        <Button
          title="Clear"
          variant="ghost"
          size="small"
          onPress={() => {
            setDraft(EMPTY_DRAFT);
            setApplied(EMPTY_DRAFT);
          }}
        />
      </View>
      <Choices
        label="Sort"
        options={SORTS}
        selected={[sort]}
        onToggle={(value) => setSort(value)}
      />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Events' }} />
      <FlatList
        data={events}
        keyExtractor={(event) => event.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <EventRow
            event={item}
            onPress={() =>
              router.push({
                pathname: '/console/[id]',
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          query.isPending ? (
            <LoadingState label="Loading events…" />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <EmptyState message="No events match these filters." />
          )
        }
        ListFooterComponent={
          events.length > 0 ? (
            <View style={styles.footer}>
              {query.isFetchNextPageError ? (
                <Banner
                  tone="error"
                  message={`More events could not be loaded. ${describeError(query.error)}`}
                />
              ) : null}
              {query.hasNextPage ? (
                <Button
                  title="Load more"
                  variant="outline"
                  size="small"
                  loading={query.isFetchingNextPage}
                  onPress={() => query.fetchNextPage()}
                />
              ) : (
                <Text variant="footnote" tone="muted">
                  End of results ({events.length}).
                </Text>
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
}

function EventRow({ event, onPress }: { event: Event; onPress: () => void }) {
  const colors = useTheme();
  const place =
    event.format === 'virtual'
      ? 'Online'
      : [event.venueName, event.city, event.countryCode]
          .filter(Boolean)
          .join(', ') || 'Location not stated';
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open ${event.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.backgroundSelected : colors.surface,
        },
      ]}
    >
      <Text variant="headline" accessibilityRole="header" numberOfLines={2}>
        {event.title}
      </Text>
      <Text variant="footnote" tone="muted">
        {eventTime(event.startAt, event.timezone)} · {place} ·{' '}
        {event.organizerName}
      </Text>
      <EventStatusBadges event={event} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 10,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: 12,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterCell: {
    minWidth: 160,
    flexGrow: 1,
  },
  row: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  footer: {
    padding: 16,
    gap: 8,
    alignItems: 'center',
  },
});
