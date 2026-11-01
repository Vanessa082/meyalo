import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/ui/event-card';
import { EVENT_MAP_SUPPORTED, EventMap } from '@/components/ui/event-map';
import { InlineMessage } from '@/components/ui/inline-message';
import { OfflineNotice } from '@/components/ui/offline-notice';
import { Page, PageHeader } from '@/components/ui/page';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useDiscoveryProfile } from '@/hooks/use-discovery-profile';
import { useForYouEvents } from '@/hooks/use-events';
import { useTranslation } from '@/i18n/locale-provider';
import { buildAroundYou, type RadiusKm } from '@/services/around-you';
import type { EventCardData } from '@/types/event.type';

type RadiusOption = '2' | '5' | '10' | 'city';

const RADIUS: Record<RadiusOption, RadiusKm> = {
  '2': 2,
  '5': 5,
  '10': 10,
  city: null,
};

export default function AroundYouScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [radius, setRadius] = useState<RadiusOption>('city');
  // The map loads only when asked for (data cost), and only where it works.
  const [view, setView] = useState<'list' | 'map'>('list');
  const {
    data: events = [],
    isPending,
    isError,
    refetch,
    fetchStatus,
    dataUpdatedAt,
  } = useForYouEvents();
  const { data: profile = null } = useDiscoveryProfile();

  const result = buildAroundYou(events, profile, RADIUS[radius]);
  const chooseCity = () => router.push('/(onboarding)/location');

  const withDistance = (event: EventCardData): EventCardData =>
    event.distanceKm == null
      ? event
      : {
          ...event,
          distanceText: t('forYou.distance', {
            km: Math.max(1, Math.round(event.distanceKm)),
          }),
        };

  return (
    <Page>
      <PageHeader
        title={t('aroundYou.title')}
        subtitle={
          result.kind === 'city'
            ? t('aroundYou.subtitle', { city: result.cityName })
            : undefined
        }
      />

      {result.kind === 'needs_city' ? (
        <Stack gap="md">
          <Text variant="headline">{t('aroundYou.needsCityTitle')}</Text>
          <Text variant="callout" tone="muted">
            {t('aroundYou.needsCityBody')}
          </Text>
          <Button title={t('aroundYou.chooseCity')} onPress={chooseCity} />
        </Stack>
      ) : result.kind === 'online_only' ? (
        <InlineMessage tone="info" message={t('aroundYou.onlineOnly')} />
      ) : isPending && fetchStatus === 'paused' ? (
        <OfflineNotice updatedAt={0} />
      ) : isPending ? (
        <Text variant="callout" tone="muted">
          {t('aroundYou.loading')}
        </Text>
      ) : isError ? (
        <InlineMessage
          tone="error"
          message={t('aroundYou.loadError')}
          actionLabel={t('aroundYou.retry')}
          onAction={() => refetch()}
        />
      ) : (
        <Stack gap="md">
          <OfflineNotice updatedAt={dataUpdatedAt} />
          {result.measured ? (
            <>
              <SegmentedControl
                accessibilityLabel={t('aroundYou.radiusLabel')}
                value={radius}
                onChange={setRadius}
                options={[
                  { value: '2', label: t('aroundYou.radius2') },
                  { value: '5', label: t('aroundYou.radius5') },
                  { value: '10', label: t('aroundYou.radius10') },
                  { value: 'city', label: t('aroundYou.radiusCity') },
                ]}
              />
              <Text variant="footnote" tone="muted">
                {t('aroundYou.measuredFrom', { city: result.cityName })}
              </Text>
            </>
          ) : (
            <Text variant="footnote" tone="muted">
              {t('aroundYou.notMeasured', { city: result.cityName })}
            </Text>
          )}

          {EVENT_MAP_SUPPORTED && result.center ? (
            <SegmentedControl
              accessibilityLabel={t('aroundYou.viewLabel')}
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: t('aroundYou.viewList') },
                { value: 'map', label: t('aroundYou.viewMap') },
              ]}
            />
          ) : null}

          {view === 'map' && EVENT_MAP_SUPPORTED && result.center ? (
            result.pinned.length > 0 ? (
              <EventMap
                center={result.center}
                radiusKm={RADIUS[radius]}
                events={result.pinned}
                onOpenEvent={(id) => router.push(`/event/${id}`)}
              />
            ) : (
              <Text variant="callout" tone="muted">
                {t('aroundYou.mapEmpty')}
              </Text>
            )
          ) : (
            result.pinned.map((event) => (
              <EventCard key={event.id} event={withDistance(event)} />
            ))
          )}

          {result.pinned.length === 0 &&
          result.unpinned.length > 0 &&
          RADIUS[radius] !== null ? (
            <Text variant="callout" tone="muted">
              {t('aroundYou.emptyRadius', { km: RADIUS[radius] ?? 0 })}
            </Text>
          ) : null}

          {result.unpinned.length > 0 ? (
            <Stack gap="md">
              <SectionHeader title={t('aroundYou.unpinned')} />
              <Text variant="footnote" tone="muted">
                {t('aroundYou.unpinnedHint')}
              </Text>
              {result.unpinned.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </Stack>
          ) : null}

          {result.pinned.length === 0 && result.unpinned.length === 0 ? (
            <Text variant="callout" tone="muted">
              {RADIUS[radius] === null
                ? t('aroundYou.empty', { city: result.cityName })
                : t('aroundYou.emptyRadius', { km: RADIUS[radius] ?? 0 })}
            </Text>
          ) : null}
        </Stack>
      )}
    </Page>
  );
}
