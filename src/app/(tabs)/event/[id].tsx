import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import {
  Bookmark,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Compass,
  ExternalLink,
  Flag,
  Globe,
  Languages,
  MapPin,
  MessageCircle,
  Navigation,
  Share2,
  Ticket,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { DidYouGo } from '@/components/event/did-you-go';
import { EventPoster } from '@/components/event/event-poster';
import { InviteFriends } from '@/components/event/invite-friends';
import { ReportSheet } from '@/components/event/report-sheet';
import { useSaveToggle } from '@/components/event/use-save-toggle';
import { PermissionPrimer } from '@/components/privacy/permission-primer';
import { useReminders } from '@/components/privacy/reminders-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EventMap } from '@/components/ui/event-map';
import { IconCircle } from '@/components/ui/icon-circle';
import { InlineMessage } from '@/components/ui/inline-message';
import { Pop } from '@/components/ui/motion';
import { OfflineNotice } from '@/components/ui/offline-notice';
import { Page } from '@/components/ui/page';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { publicEnv, publicUrl } from '@/config/env';
import { REGION } from '@/config/region';
import previews from '@/generated/event-previews.json';
import { useEventDetail, useEventTranslation } from '@/hooks/use-events';
import { useGutter } from '@/hooks/use-gutter';
import { useLearnFromActivity, useRecordOpen } from '@/hooks/use-learning';
import { useSavedEvents, useSetPlan } from '@/hooks/use-saved-events';
import { useTheme } from '@/hooks/use-theme';
import { formatDayHeading } from '@/i18n/format';
import { useTranslation } from '@/i18n/locale-provider';
import {
  addToDeviceCalendar,
  calendarNeedsPrimer,
} from '@/lib/device-calendar';
import { toCalendarEntry } from '@/services/calendar-entry';
import { directionsUrl } from '@/services/directions';
import { describeEventCard, publicLinkLabel } from '@/services/event-mapping';
import { type EventPreview, previewMeta } from '@/services/event-preview';
import { isEventRepositoryError } from '@/services/event-repository';
import { eventSpan, hasEnded } from '@/services/event-time';
import { moreLikeThis } from '@/services/explore-params';
import { isUpcoming } from '@/services/ranking.service';
import { buildShareText, whatsAppUrl } from '@/services/share';
import { instantToWallTime } from '@/services/zoned-time';
import { Spacing, TouchTargets } from '@/theme';
import type { EventCardData } from '@/types/event.type';

function EventDetailScreen() {
  const colors = useTheme();
  const router = useRouter();
  const gutter = useGutter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const i18n = useTranslation();
  const { t } = i18n;
  const toast = useToast();
  const [reporting, setReporting] = useState(false);
  const [primer, setPrimer] = useState(false);
  // Phones always have a share sheet; browsers only with the Web Share API.
  // Decided after mount so the first render matches the static HTML.
  const [canSystemShare, setCanSystemShare] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (Platform.OS === 'web') {
      setCanSystemShare(typeof navigator.share === 'function');
    }
  }, []);
  const {
    data: fetched,
    isPending,
    isError,
    refetch,
    fetchStatus,
  } = useEventDetail(id ?? '');
  const { data: plans = [] } = useSavedEvents();
  const planEntry = plans.find((entry) => entry.id === id);
  // An ended event later taken down still opens from the plan's saved copy,
  // so "Did you go?" stays answerable.
  // The saved copy has no description; the page says it was not stated.
  const event: EventCardData | null | undefined =
    fetched ??
    (planEntry?.snapshot && hasEnded(planEntry.snapshot, new Date())
      ? planEntry.snapshot
      : fetched);
  const { isSaved, toggle: toggleSave } = useSaveToggle(event);
  // An open is a weak "interested" signal, kept on the phone, only while
  // "Learn from my activity" is on.
  const { data: learnOn } = useLearnFromActivity();
  const { mutate: recordOpen } = useRecordOpen();
  useEffect(() => {
    if (learnOn && event) recordOpen(event);
  }, [learnOn, event, recordOpen]);
  const setPlan = useSetPlan();
  const { askAfterGoing } = useReminders();
  const isGoing =
    plans.find((entry) => entry.id === event?.id)?.plan === 'going';
  const toggleGoing = () => {
    if (!event) return;
    setPlan.mutate(
      { event, plan: isGoing ? 'saved' : 'going' },
      {
        onSuccess: () => {
          if (!isGoing) askAfterGoing();
        },
        onError: () =>
          toast.show({ tone: 'error', message: t('eventCard.saveFailed') }),
      },
    );
  };

  // Translate only when none of the event's languages is the app language,
  // and only once the server has a provider (Feature 6 spec).
  const canTranslate =
    publicEnv.translationEnabled &&
    !!event &&
    event.languages.length > 0 &&
    !event.languages.includes(i18n.language);
  const [showTranslation, setShowTranslation] = useState(false);
  const translation = useEventTranslation(
    id ?? '',
    i18n.language,
    canTranslate && showTranslation,
  );
  const translated =
    canTranslate && showTranslation ? translation.data : undefined;
  const translationUnavailable =
    isEventRepositoryError(translation.error) &&
    translation.error.code === 'not_configured';

  const link = event
    ? publicLinkLabel(event, i18n)
    : { title: t('eventText.noLink') };
  const text = event ? describeEventCard(event, i18n) : null;
  const provenanceConfirmed =
    event?.verificationState === 'source_confirmed' ||
    event?.verificationState === 'organizer_confirmed';

  const shareFailed = () =>
    toast.show({ tone: 'error', message: t('eventDetail.shareFailed') });

  // A public https link when the site address is configured. On the web the
  // current site works too; in the app without one, share the text alone
  // rather than an app-only link the recipient cannot open.
  const shareText = () => {
    if (!event || !text) return '';
    const path = `/event/${event.id}`;
    const url =
      publicUrl(path) ??
      (Platform.OS === 'web' ? Linking.createURL(path) : null);
    return buildShareText(event, text, url, {
      online: t('eventCard.online'),
      venueTbc: t('eventCard.venueTbc'),
      via: t('eventDetail.shareVia'),
    });
  };

  // On the web, keep Meyalo open: WhatsApp goes to a new tab.
  const shareOnWhatsApp = () => {
    const url = whatsAppUrl(shareText());
    if (Platform.OS === 'web') {
      if (!window.open(url, '_blank', 'noopener')) shareFailed();
      return;
    }
    Linking.openURL(url).catch(shareFailed);
  };

  // On the web, open maps in a new tab and keep Meyalo open.
  const mapsUrl = event
    ? directionsUrl(
        event,
        Platform.OS === 'ios'
          ? 'ios'
          : Platform.OS === 'android'
            ? 'android'
            : 'web',
      )
    : null;
  const directionsFailed = () =>
    toast.show({ tone: 'error', message: t('eventDetail.directionsFailed') });
  const openDirections = () => {
    if (!mapsUrl) return;
    if (Platform.OS === 'web') {
      if (!window.open(mapsUrl, '_blank', 'noopener')) directionsFailed();
      return;
    }
    Linking.openURL(mapsUrl).catch(directionsFailed);
  };

  const addToCalendar = async () => {
    if (!event) return;
    if (await calendarNeedsPrimer().catch(() => false)) {
      setPrimer(true);
      return;
    }
    await openCalendar();
  };

  const openCalendar = async () => {
    if (!event) return;
    const entry = toCalendarEntry(event, {
      online: t('eventCard.online'),
      organizer: t('eventDetail.calendarOrganizer', {
        name: event.organizerName,
      }),
      endNotStated: t('eventDetail.calendarEndNotStated'),
      footer: t('eventDetail.shareVia'),
    });
    try {
      const result = await addToDeviceCalendar(entry, event.slug || event.id);
      if (result === 'saved') {
        toast.show({
          tone: 'success',
          message: t('eventDetail.calendarSaved'),
        });
      } else if (result === 'downloaded') {
        toast.show({
          tone: 'info',
          message: t('eventDetail.calendarDownloaded'),
        });
      } else if (result === 'denied') {
        toast.show({ tone: 'error', message: t('eventDetail.calendarDenied') });
      }
      // `opened` and `cancelled`: the user saw the calendar; nothing to add.
    } catch {
      toast.show({
        tone: 'error',
        message: t('eventDetail.calendarFailed'),
        actionLabel: t('eventCard.retry'),
        onAction: addToCalendar,
      });
    }
  };

  const handleOpenSource = () => {
    if (!link.url) return;
    Linking.openURL(link.url).catch(() =>
      toast.show({ tone: 'error', message: t('eventDetail.openFailed') }),
    );
  };

  // States other than the loaded event share one centred, readable layout.
  const state = (content: React.ReactNode) => (
    <Page width="readable">
      <Stack gap="lg" align="center" style={styles.state}>
        {content}
      </Stack>
    </Page>
  );
  const backButton = (variant: 'ghost' | 'primary' = 'ghost') => (
    <Button
      title={t('eventDetail.back')}
      variant={variant}
      onPress={() => router.back()}
    />
  );

  if (isPending && fetchStatus === 'paused') {
    // Offline and nothing on the phone for this event: say so, not "not found".
    return state(
      <>
        <OfflineNotice updatedAt={0} />
        {backButton()}
      </>,
    );
  }

  if (isPending) {
    return state(
      <Text variant="callout" tone="muted">
        {t('eventDetail.loading')}
      </Text>,
    );
  }

  if (isError) {
    // A failed request is not a missing event: say so and offer a retry.
    return state(
      <>
        <InlineMessage
          tone="error"
          message={t('eventDetail.loadError')}
          actionLabel={t('eventDetail.retry')}
          onAction={() => refetch()}
        />
        {backButton()}
      </>,
    );
  }

  if (!event || !text) {
    return state(
      <>
        <Text variant="title1" accessibilityRole="header" align="center">
          {t('eventDetail.notFoundTitle')}
        </Text>
        <Text variant="callout" tone="muted" align="center">
          {t('eventDetail.notFoundBody')}
        </Text>
        {backButton('primary')}
      </>,
    );
  }

  const formatLabel =
    event.format === 'in_person'
      ? t('eventDetail.formatInPerson')
      : event.format === 'hybrid'
        ? t('eventDetail.formatHybrid')
        : t('eventDetail.formatVirtual');
  const hero = (
    <View>
      <EventPoster
        event={{ ...event, title: translated?.title ?? event.title }}
        size="hero"
        square
        asHeading
        meta={[event.eventType, formatLabel].join(' · ')}
      />
      {event.coverImageCredit ? (
        <Text
          variant="caption"
          tone="muted"
          style={[styles.credit, { paddingHorizontal: gutter }]}
        >
          {event.coverImageCredit}
        </Text>
      ) : null}
    </View>
  );
  const ended = hasEnded(event, new Date());
  const endedOn = formatDayHeading(
    instantToWallTime(
      new Date(eventSpan(event).end).toISOString(),
      event.timezone || REGION.timeZone,
    ).slice(0, 10),
    i18n.language,
  );
  const pinned =
    !ended &&
    event.format !== 'virtual' &&
    event.latitude != null &&
    event.longitude != null;

  return (
    <Page
      width="readable"
      hero={hero}
      footer={
        ended ? (
          <Stack gap="sm">
            <InlineMessage
              tone="info"
              message={t('eventDetail.ended', { date: endedOn })}
            />
            <Button
              title={t('eventDetail.moreLikeThis')}
              variant="primary"
              size="large"
              fullWidth
              icon={<Compass size={18} color={colors.onPrimary} />}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/explore',
                  params: moreLikeThis(event),
                })
              }
            />
          </Stack>
        ) : (
          <Stack gap="xs">
            <Stack direction="row" gap="sm" align="center">
              <Pressable
                onPress={toggleSave}
                accessibilityRole="button"
                accessibilityState={{ selected: isSaved }}
                accessibilityLabel={t(
                  isSaved ? 'eventCard.unsave' : 'eventCard.save',
                  { title: event.title },
                )}
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Pop active={isSaved}>
                  <Bookmark
                    size={20}
                    color={isSaved ? colors.primary : colors.text}
                    fill={isSaved ? colors.primary : 'none'}
                  />
                </Pop>
              </Pressable>
              <Pressable
                onPress={toggleGoing}
                accessibilityRole="button"
                accessibilityState={{ selected: isGoing }}
                accessibilityLabel={t(
                  isGoing ? 'eventDetail.notGoing' : 'eventDetail.going',
                  { title: event.title },
                )}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: isGoing
                      ? colors.primary
                      : colors.surfaceSecondary,
                  },
                ]}
              >
                <Pop active={isGoing}>
                  <CalendarCheck
                    size={20}
                    color={isGoing ? colors.onPrimary : colors.text}
                  />
                </Pop>
              </Pressable>
              <View style={styles.fill}>
                <Button
                  title={link.title}
                  variant="primary"
                  size="large"
                  fullWidth
                  icon={<ExternalLink size={18} color={colors.onPrimary} />}
                  onPress={handleOpenSource}
                  disabled={!link.url}
                />
              </View>
            </Stack>
            {link.url ? (
              <Text variant="caption" tone="muted" align="center">
                {event.registrationUrl
                  ? t('eventDetail.opensRegistration')
                  : t('eventDetail.opensSource')}
              </Text>
            ) : null}
          </Stack>
        )
      }
    >
      {ended && planEntry ? (
        <DidYouGo entry={planEntry} title={event.title} />
      ) : null}
      {!ended && isGoing ? (
        <InviteFriends eventId={event.id} title={event.title} />
      ) : null}
      <Card
        variant="flat"
        padding="md"
        style={[
          styles.outlined,
          { backgroundColor: colors.primarySoft, borderColor: colors.border },
        ]}
      >
        <Stack gap="sm">
          <Stack direction="row" gap="sm" align="center">
            <VerifiedBadge state={event.verificationState} size={22} />
            <Text variant="headline" accessibilityRole="header">
              {text.trustLabel ?? t('eventDetail.notReviewed')}
            </Text>
          </Stack>
          <Text variant="footnote">
            {t('eventDetail.organizedBy')}
            <Text variant="footnote" weight="bold">
              {event.organizerName}
            </Text>
          </Text>
          {text.verificationText ? (
            <Stack direction="row" gap="sm" align="center">
              {provenanceConfirmed ? null : (
                <Globe size={16} color={colors.textMuted} />
              )}
              <Text variant="footnote" tone="muted" style={styles.fill}>
                {text.verificationText}
              </Text>
            </Stack>
          ) : null}
        </Stack>
      </Card>

      <Stack gap="lg">
        <Stack direction="row" gap="md" align="center">
          <IconCircle icon={Calendar} tone="surface" />
          <Stack gap="xxs" style={styles.fill}>
            <Text variant="headline">{text.dateText}</Text>
            <Text variant="footnote" tone="muted">
              {event.timezone
                ? t('eventDetail.timezone', { zone: event.timezone })
                : t('eventDetail.timezoneNotStated')}
            </Text>
          </Stack>
        </Stack>
        <Stack direction="row" gap="md" align="center">
          <IconCircle icon={MapPin} tone="surface" />
          <Stack gap="xxs" style={styles.fill}>
            <Text variant="headline">
              {event.format === 'virtual'
                ? t('eventCard.online')
                : (event.venueName ?? event.city ?? t('eventCard.venueTbc'))}
            </Text>
            <Text variant="footnote" tone="muted">
              {event.format === 'virtual'
                ? t('eventCard.online')
                : event.address
                  ? [event.address, event.city].filter(Boolean).join(', ')
                  : (event.city ?? t('eventCard.venueTbc'))}
            </Text>
          </Stack>
        </Stack>
        {pinned ? (
          <EventMap
            center={{
              lat: event.latitude as number,
              lng: event.longitude as number,
            }}
            radiusKm={0.6}
            events={[event]}
            onOpenEvent={openDirections}
            height={180}
          />
        ) : null}
        <Stack direction="row" gap="md" align="center">
          <IconCircle icon={Ticket} tone="surface" />
          <Stack gap="xxs" style={styles.fill}>
            <Text variant="headline">{text.priceLabel}</Text>
            <Text variant="footnote" tone="muted">
              {t('eventDetail.priceNote')}
            </Text>
          </Stack>
        </Stack>
      </Stack>

      <Stack gap="sm">
        <Stack direction="row" gap="sm" align="center" justify="space-between">
          <Text variant="headline" accessibilityRole="header">
            {t('eventDetail.about')}
          </Text>
          {canTranslate ? (
            <Button
              title={
                showTranslation
                  ? t('eventDetail.showOriginal')
                  : t('eventDetail.translateTo', {
                      language: t(`eventDetail.languageName.${i18n.language}`),
                    })
              }
              variant="ghost"
              size="small"
              loading={showTranslation && translation.isFetching}
              icon={<Languages size={16} color={colors.primary} />}
              onPress={() => setShowTranslation((on) => !on)}
            />
          ) : null}
        </Stack>
        {translated ? (
          <Text variant="footnote" tone="muted">
            {t('eventDetail.machineTranslated')}
          </Text>
        ) : null}
        {showTranslation && translation.isError ? (
          <InlineMessage
            tone={translationUnavailable ? 'info' : 'error'}
            message={
              translationUnavailable
                ? t('eventDetail.translateUnavailable')
                : t('eventDetail.translateFailed')
            }
            actionLabel={
              translationUnavailable ? undefined : t('eventDetail.retry')
            }
            onAction={
              translationUnavailable ? undefined : () => translation.refetch()
            }
          />
        ) : null}
        <Text variant="body" lang={translated ? i18n.language : undefined}>
          {translated?.description ||
            (event.description?.trim()
              ? event.description
              : t('eventDetail.descriptionNotStated'))}
        </Text>
      </Stack>

      <Stack direction="row" gap="sm" wrap>
        <Button
          title={t('eventDetail.shareWhatsApp')}
          variant="secondary"
          icon={<MessageCircle size={18} color={colors.text} />}
          onPress={shareOnWhatsApp}
        />
        {canSystemShare ? (
          <Button
            title={t('eventDetail.share')}
            variant="ghost"
            icon={<Share2 size={18} color={colors.primary} />}
            onPress={() =>
              Share.share({ message: shareText() }).catch(shareFailed)
            }
          />
        ) : null}
        {isUpcoming(event, new Date()) ? (
          <Button
            title={t('eventDetail.addToCalendar')}
            variant="ghost"
            icon={<CalendarPlus size={18} color={colors.primary} />}
            onPress={addToCalendar}
          />
        ) : null}
        {mapsUrl && !ended ? (
          <Button
            title={t('eventDetail.directions')}
            variant="ghost"
            icon={<Navigation size={18} color={colors.primary} />}
            onPress={openDirections}
          />
        ) : null}
      </Stack>

      <InlineMessage tone="info" message={t('eventDetail.neverPay')} />

      {ended ? null : (
        <Pressable
          onPress={() => setReporting(true)}
          style={styles.reportRow}
          accessibilityRole="button"
        >
          <Flag size={14} color={colors.textMuted} />
          <Text variant="footnote" tone="muted">
            {t('report.open')}
          </Text>
        </Pressable>
      )}
      <ReportSheet
        eventId={event.id}
        visible={reporting}
        onClose={() => setReporting(false)}
      />
      <PermissionPrimer
        kind="calendar"
        visible={primer}
        onAllow={() => {
          setPrimer(false);
          void openCalendar();
        }}
        onNotNow={() => setPrimer(false)}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  state: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  credit: {
    paddingTop: Spacing.xs,
  },
  saveButton: {
    width: TouchTargets.recommended,
    height: TouchTargets.recommended,
    borderRadius: TouchTargets.recommended / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlined: {
    borderWidth: 1,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    minHeight: TouchTargets.minimum,
  },
});

const PREVIEWS = previews.events as Record<string, EventPreview>;

/** Static export: one HTML page per event known at build time. */
export async function generateStaticParams(): Promise<
  Record<string, string>[]
> {
  return Object.keys(PREVIEWS).map((id) => ({ id }));
}

/**
 * Link-preview tags for WhatsApp, Facebook and search. Rendered around every
 * state of the screen so the static HTML always carries them.
 */
export default function EventDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const preview = id ? PREVIEWS[id] : undefined;
  return (
    <>
      {preview ? (
        <Head>
          <title>{`${preview.title} · Meyalo`}</title>
          {previewMeta(preview, publicEnv.appBaseUrl).map((tag) =>
            tag.key.startsWith('og:') ? (
              <meta key={tag.key} property={tag.key} content={tag.content} />
            ) : (
              <meta key={tag.key} name={tag.key} content={tag.content} />
            ),
          )}
        </Head>
      ) : null}
      <EventDetailScreen />
    </>
  );
}
