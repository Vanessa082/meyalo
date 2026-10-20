import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CheckForm } from '@/components/console/check-form';
import { CheckHistory } from '@/components/console/check-history';
import {
  Banner,
  describeError,
  ErrorState,
  LoadingState,
  Row,
  Section,
} from '@/components/console/console-ui';
import { CoverImageForm } from '@/components/console/cover-image-form';
import {
  EventStatusBadges,
  eventTime,
  freshnessBadge,
} from '@/components/console/event-status';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useChangePublication, useCurationEvent } from '@/hooks/use-curation';
import { useCuratorSession } from '@/hooks/use-curator-session';
import { useTheme } from '@/hooks/use-theme';
import { translate } from '@/i18n';
import {
  COMPLETENESS_LABELS,
  completenessIssues,
  FORMAT_LABELS,
  PUBLICATION_LABELS,
  PUBLICATION_TRANSITIONS,
  publicationChangeBlocker,
  SOURCE_TYPE_LABELS,
  VERIFICATION_LABELS,
} from '@/services/event-domain';
import { buildPriceLabel, type Localizer } from '@/services/event-mapping';
import { httpsHost } from '@/services/url';
import { instantToWallTime } from '@/services/zoned-time';
import type { Event } from '@/types/event.type';

export default function CurationEventScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useCurationEvent(id ?? '');
  const event = query.data;
  const publication = useChangePublication(event);
  const { userId } = useCuratorSession();
  const [notice, setNotice] = useState<string | null>(null);

  if (query.isPending) return <LoadingState label="Loading event…" />;
  if (query.isError || !event) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }

  const actionError = publication.error;
  const busy = publication.isPending;
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
        <Text variant="title2" accessibilityRole="header" selectable>
          {event.title}
        </Text>
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
        <Text variant="footnote">
          Currently {PUBLICATION_LABELS[event.publicationStatus].toLowerCase()}.
          {event.publicationStatus === 'published'
            ? ' Visible to the public.'
            : ' Not visible to the public.'}
        </Text>
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
                    publication.mutate(to, {
                      onSuccess: (saved) =>
                        setNotice(
                          `Saved. The event is now ${PUBLICATION_LABELS[saved.publicationStatus].toLowerCase()}.`,
                        ),
                    });
                  }}
                />
                {blocker ? (
                  <Text variant="footnote" tone="muted">
                    {blocker}
                  </Text>
                ) : null}
              </View>
            );
          })}
          {PUBLICATION_TRANSITIONS[event.publicationStatus].length === 0 ? (
            <Text variant="footnote" tone="muted">
              No further status changes.
            </Text>
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
      </Section>

      <Section title="Image">
        <CoverImageForm event={event} />
      </Section>

      <Section title="Record a check">
        <CheckForm event={event} />
      </Section>

      <Section title="Checks and reports">
        <CheckHistory
          eventId={event.id}
          curatorNames={userId ? { [userId]: 'You' } : {}}
        />
      </Section>

      <Section title="Missing or unconfirmed details">
        {issues.length === 0 ? (
          <Text variant="footnote" tone="muted">
            Nothing missing.
          </Text>
        ) : (
          issues.map((issue) => (
            <Text key={issue} variant="footnote">
              • {COMPLETENESS_LABELS[issue]}
            </Text>
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
      <Text variant="footnote" weight="bold">
        {host ?? 'Not a valid https link'}
      </Text>
      <Text
        variant="footnote"
        tone="primary"
        selectable
        onPress={host ? () => Linking.openURL(url) : undefined}
      >
        {url}
      </Text>
    </View>
  );
}

/** The console is English only, like the rest of its copy. */
const CONSOLE_I18N: Localizer = {
  language: 'en',
  t: (key, params) => translate(key, params, 'en'),
};

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
      <Row label="Price" value={buildPriceLabel(event, CONSOLE_I18N)} />
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
