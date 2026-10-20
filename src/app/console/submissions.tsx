import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Banner,
  Choices,
  describeError,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Row,
  Section,
} from '@/components/console/console-ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useDecideSubmission, useSubmissions } from '@/hooks/use-supply';
import {
  isSupplyError,
  type Submission,
  type SubmissionStatus,
} from '@/services/supply';
import { Spacing } from '@/theme';

const VIEWS: { value: SubmissionStatus; label: string }[] = [
  { value: 'under_review', label: 'Waiting' },
  { value: 'published', label: 'Added' },
  { value: 'not_added', label: 'Not added' },
];

/** Suggestions from the public /submit page, for curators to decide. */
export default function SubmissionsScreen() {
  const router = useRouter();
  const [view, setView] = useState<SubmissionStatus>('under_review');
  const query = useSubmissions(view);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'Submissions' }} />
      <View style={styles.titleRow}>
        <Text variant="title2" accessibilityRole="header">
          Submissions
        </Text>
        <Button
          title="Events"
          variant="outline"
          size="small"
          onPress={() => router.push('/console')}
        />
      </View>
      <Text variant="footnote" tone="muted">
        From the public "Suggest an event" page. Check each one like any other
        source, create the event if it promotes growth, then record the decision
        here. The person who suggested it sees the outcome and your reason.
      </Text>
      <Choices
        label="Show"
        options={VIEWS}
        selected={[view]}
        onToggle={(value) => setView(value)}
      />

      {query.isPending ? (
        <LoadingState label="Loading submissions…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState message="Nothing here." />
      ) : (
        query.data.map((submission) => (
          <SubmissionCard key={submission.id} submission={submission} />
        ))
      )}
    </ScrollView>
  );
}

function SubmissionCard({ submission }: { submission: Submission }) {
  const router = useRouter();
  const decide = useDecideSubmission();
  const [eventId, setEventId] = useState('');
  const [reason, setReason] = useState('');
  const waiting = submission.status === 'under_review';

  return (
    <Section
      title={`Received ${submission.createdAt.slice(0, 16).replace('T', ' ')} UTC`}
    >
      <Row label="Link" value={submission.sourceUrl ?? 'None'} />
      <Row label="Description" value={submission.description ?? 'None'} />
      {submission.note ? <Row label="Note" value={submission.note} /> : null}
      {submission.decisionReason ? (
        <Row label="Reason given" value={submission.decisionReason} />
      ) : null}
      {submission.publishedEventId ? (
        <Row label="Became event" value={submission.publishedEventId} />
      ) : null}

      {waiting ? (
        <View style={styles.decision}>
          <Button
            title="Create the event"
            variant="outline"
            size="small"
            onPress={() => router.push('/console/new')}
          />
          <Field
            label="Added: id of the event it became"
            autoCapitalize="none"
            value={eventId}
            onChangeText={setEventId}
          />
          <Button
            title="Mark as added"
            size="small"
            loading={decide.isPending}
            onPress={() =>
              decide.mutate({
                id: submission.id,
                decision: { status: 'published', eventId },
              })
            }
          />
          <Field
            label="Not added: reason the person will see"
            hint="For example: not a growth event, already listed, could not confirm with the organiser."
            value={reason}
            onChangeText={setReason}
          />
          <Button
            title="Mark as not added"
            variant="outline"
            size="small"
            loading={decide.isPending}
            onPress={() =>
              decide.mutate({
                id: submission.id,
                decision: { status: 'not_added', reason },
              })
            }
          />
          {decide.error ? (
            <Banner
              tone="error"
              message={
                isSupplyError(decide.error)
                  ? decide.error.message
                  : describeError(decide.error)
              }
            />
          ) : null}
        </View>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: Spacing.lg,
    gap: Spacing.md,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  decision: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
