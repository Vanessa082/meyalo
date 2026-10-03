import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Banner,
  describeError,
  ErrorState,
  LoadingState,
  Row,
  Section,
} from '@/components/console/console-ui';
import {
  EventStatusBadges,
  eventTime,
  freshnessBadge,
} from '@/components/console/event-status';
import { Button } from '@/components/ui/button';
import { ThemeText } from '@/components/ui/theme-text';
import {
  useChangePublication,
  useCurationEvent,
  useRecordVerification,
} from '@/hooks/use-curation';
import { useCuratorSession } from '@/hooks/use-curator-session';
import { useTheme } from '@/hooks/use-theme';
import {
  COMPLETENESS_LABELS,
  completenessIssues,
  FORMAT_LABELS,
  PUBLICATION_LABELS,
  PUBLICATION_TRANSITIONS,
  publicationChangeBlocker,
  SOURCE_TYPE_LABELS,
  VERIFICATION_LABELS,
  verificationChangeBlocker,
} from '@/services/event-domain';
import { buildPriceLabel } from '@/services/event-mapping';
import { httpsHost } from '@/services/url';
import { instantToWallTime } from '@/services/zoned-time';
import type { Event, VerificationState } from '@/types/event.type';

const VERIFICATION_ACTIONS: { to: VerificationState; label: string }[] = [
  { to: 'source_confirmed', label: 'Record source check' },
  { to: 'organizer_confirmed', label: 'Record organizer confirmation' },
  { to: 'unreviewed', label: 'Mark unreviewed' },
];

export default function CurationEventScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useCurationEvent(id ?? '');
  const event = query.data;
  const publication = useChangePublication(event);
  const verification = useRecordVerification(event);
  const { userId } = useCuratorSession();
  const [notice, setNotice] = useState<string | null>(null);

  if (query.isPending) return <LoadingState label="Loading event…" />;
  if (query.isError || !event) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const actionError = publication.error ?? verification.error;
  const busy = publication.isPending || verification.isPending;
  const issues = completenessIssues(event);
  const stale = freshnessBadge(event);
  const sourceHost = httpsHost(event.sourceUrl);
  const registrationHost = httpsHost(event.registrationUrl);

  const checkedBy = event.checkedBy
    ? event.checkedBy === userId
      ? 'You'
      : event.checkedBy
    : 'Nobody';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page}
    >
      <Stack.Screen options={{ title: event.title }} />

      <View style={styles.heading}>
        <ThemeText variant="h2" selectable>
          {event.title}
        </ThemeText>
        <EventStatusBadges event={event} />
        <View style={styles.actions}>
          <Button
            title="Edit"
            size="small"
            onPress={() =>
              router.push({
                pathname: '/console/[id]/edit',
                params: { id: event.id },
              })
            }
          />
          <Button
            title="Reload"
            variant="ghost"
            size="small"
            loading={query.isFetching}
            onPress={() => {
              setNotice(null);
              publication.reset();
              verification.reset();
              query.refetch();
            }}
          />
        </View>
      </View>

      {notice ? <Banner tone="success" message={notice} /> : null}
      {actionError ? (
        <Banner
          tone="error"
          message={`Not changed. ${describeError(actionError)}`}
        />
      ) : null}

      <Section title="Publication">
        <ThemeText variant="caption">
          Currently {PUBLICATION_LABELS[event.publicationStatus].toLowerCase()}.
          {event.publicationStatus === 'published'
            ? ' Visible to the public.'
            : ' Not visible to the public.'}
        </ThemeText>
        <View style={styles.actions}>
          {PUBLICATION_TRANSITIONS[event.publicationStatus].map((to) => {
            const blocker = publicationChangeBlocker(event, to);
            return (
              <View key={to} style={styles.action}>
                <Button
                  title={`Move to ${PUBLICATION_LABELS[to].toLowerCase()}`}
                  variant="outline"
                  size="small"
                  disabled={busy || blocker !== null}
                  loading={
                    publication.isPending && publication.variables === to
                  }
                  onPress={() => {
                    setNotice(null);
                    verification.reset();
                    publication.mutate(to, {
                      onSuccess: (saved) =>
                        setNotice(
                          `Saved. The event is now ${PUBLICATION_LABELS[saved.publicationStatus].toLowerCase()}.`,
                        ),
                    });
                  }}
                />
                {blocker ? (
                  <ThemeText variant="caption" themeColor="textMuted">
                    {blocker}
                  </ThemeText>
                ) : null}
              </View>
            );
          })}
          {PUBLICATION_TRANSITIONS[event.publicationStatus].length === 0 ? (
            <ThemeText variant="caption" themeColor="textMuted">
              No further status changes.
            </ThemeText>
          ) : null}
        </View>
      </Section>

      <Section title="Provenance and verification">
        <Row
          label="Verification"
          value={VERIFICATION_LABELS[event.verificationState]}
        />
        <Row
          label="Last checked"
          value={
            event.lastCheckedAt
              ? `${instantToWallTime(event.lastCheckedAt, event.timezone ?? 'UTC')} (${event.timezone ?? 'UTC'})`
              : 'Never'
          }
        />
        <Row label="Checked by" value={checkedBy} />
        {stale ? <Row label="Freshness" value={stale.label} /> : null}
        <Row label="Source type" value={SOURCE_TYPE_LABELS[event.sourceType]} />
        <Row
          label="Source"
          value={<LinkValue url={event.sourceUrl} host={sourceHost} />}
        />
        <Row
          label="Registration"
          value={
            event.registrationUrl ? (
              <LinkValue url={event.registrationUrl} host={registrationHost} />
            ) : (
              'No registration link. People are sent to the source.'
            )
          }
        />
        <Row
          label="Organizer"
          value={
            event.organizerId
              ? event.organizerName
              : `${event.organizerName} (not linked to an organizer record)`
          }
        />
        <Row
          label="From submission"
          value={event.sourceSubmissionId ?? 'Not from a submission'}
        />
        <View style={styles.actions}>
          {VERIFICATION_ACTIONS.map(({ to, label }) => {
            const blocker = verificationChangeBlocker(event, to);
            return (
              <View key={to} style={styles.action}>
                <Button
                  title={label}
                  variant="outline"
                  size="small"
                  disabled={busy || blocker !== null}
                  loading={
                    verification.isPending && verification.variables === to
                  }
                  onPress={() => {
                    setNotice(null);
                    publication.reset();
                    verification.mutate(to, {
                      onSuccess: (saved) =>
                        setNotice(
                          `Saved. Verification is now "${VERIFICATION_LABELS[saved.verificationState]}".`,
                        ),
                    });
                  }}
                />
                {blocker ? (
                  <ThemeText variant="caption" themeColor="textMuted">
                    {blocker}
                  </ThemeText>
                ) : null}
              </View>
            );
          })}
        </View>
        <ThemeText variant="caption" themeColor="textMuted">
          Record a check only after comparing title, date and time, place,
          format and links with the source.
        </ThemeText>
      </Section>

      <Section title="Missing or unconfirmed details">
        {issues.length === 0 ? (
          <ThemeText variant="caption" themeColor="textMuted">
            Nothing missing.
          </ThemeText>
        ) : (
          issues.map((issue) => (
            <ThemeText key={issue} variant="caption">
              • {COMPLETENESS_LABELS[issue]}
            </ThemeText>
          ))
        )}
      </Section>

      <EventDetails event={event} />
    </ScrollView>
  );
}

function LinkValue({ url, host }: { url: string; host: string | null }) {
  return (
    <View style={styles.link}>
      <ThemeText variant="captionBold">
        {host ?? 'Not a valid https link'}
      </ThemeText>
      <ThemeText
        variant="caption"
        themeColor="textLink"
        selectable
        onPress={host ? () => Linking.openURL(url) : undefined}
      >
        {url}
      </ThemeText>
    </View>
  );
}

function EventDetails({ event }: { event: Event }) {
  return (
    <Section title="Details">
      <Row label="Category" value={event.category} />
      <Row label="Format" value={FORMAT_LABELS[event.format]} />
      <Row label="Starts" value={eventTime(event.startAt, event.timezone)} />
      <Row label="Ends" value={eventTime(event.endAt, event.timezone)} />
      <Row
        label="Registration closes"
        value={eventTime(event.registrationDeadline, event.timezone)}
      />
      <Row label="Venue" value={event.venueName ?? 'Not stated'} />
      <Row label="Address" value={event.address ?? 'Not stated'} />
      <Row label="City" value={event.city ?? 'Not stated'} />
      <Row label="Country" value={event.countryCode ?? 'Not stated'} />
      <Row
        label="Coordinates"
        value={
          event.latitude !== null && event.longitude !== null
            ? `${event.latitude}, ${event.longitude}`
            : 'Not pinned'
        }
      />
      <Row
        label="Online access"
        value={event.virtualAccessType ?? 'Not stated'}
      />
      <Row label="Price" value={buildPriceLabel(event)} />
      <Row
        label="Languages"
        value={
          event.languages.length ? event.languages.join(', ') : 'Not stated'
        }
      />
      <Row
        label="Topics"
        value={event.topics.length ? event.topics.join(', ') : 'None'}
      />
      <Row
        label="Offers"
        value={event.offers.length ? event.offers.join(', ') : 'None'}
      />
      <Row label="Description" value={event.description} />
      <Row label="Event id" value={event.id} />
      <Row label="Last saved" value={event.updatedAt} />
    </Section>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 14,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  heading: {
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  action: {
    gap: 4,
    maxWidth: 260,
  },
  link: {
    gap: 2,
  },
});
