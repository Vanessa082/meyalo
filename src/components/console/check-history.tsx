import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useEventChecks, useEventReports } from '@/hooks/use-curation';
import {
  CHECK_METHOD_LABELS,
  RED_FLAG_LABELS,
  VERIFICATION_LABELS,
} from '@/services/event-domain';
import { Spacing } from '@/theme';
import type { ReportReason } from '@/types/event.type';
import { Banner, describeError, Row } from './console-ui';

const REASON_LABELS: Record<ReportReason, string> = {
  cancelled_or_postponed: 'Cancelled or postponed',
  wrong_datetime: 'Wrong date or time',
  wrong_place: 'Wrong place',
  broken_link: "Link doesn't work",
  scam: 'Looks like a scam',
  duplicate: 'Duplicate listing',
  other: 'Something else',
};

function when(iso: string): string {
  return `${iso.slice(0, 16).replace('T', ' ')} UTC`;
}

/** The evidence trail and what people reported, newest first. */
export function CheckHistory({
  eventId,
  curatorNames,
}: {
  eventId: string;
  /** Known curator ids to show instead of raw ids, e.g. the signed-in one. */
  curatorNames: Record<string, string>;
}) {
  const checks = useEventChecks(eventId);
  const reports = useEventReports(eventId);

  return (
    <View style={styles.container}>
      <Text variant="headline">Checks</Text>
      {checks.isError ? (
        <Banner tone="error" message={describeError(checks.error)} />
      ) : checks.data?.length === 0 ? (
        <Text variant="footnote" tone="muted">
          No checks recorded yet.
        </Text>
      ) : (
        checks.data?.map((check) => (
          <View key={check.id} style={styles.item}>
            <Row
              label={when(check.createdAt)}
              value={`${check.outcome === 'confirmed' ? VERIFICATION_LABELS[check.state] : 'Rejected'} · ${CHECK_METHOD_LABELS[check.method]}`}
            />
            <Row
              label="By"
              value={curatorNames[check.checkedBy] ?? check.checkedBy}
            />
            <Row label="Evidence" value={check.evidenceUrl} />
            <Row
              label="Fee"
              value={check.chargesFee ? 'Charges a fee' : 'No fee'}
            />
            {check.redFlags.length > 0 ? (
              <Row
                label="Red flags"
                value={check.redFlags
                  .map((flag) => RED_FLAG_LABELS[flag])
                  .join('; ')}
              />
            ) : null}
            {check.notes ? <Row label="Notes" value={check.notes} /> : null}
          </View>
        ))
      )}

      <Text variant="headline">Reports from people</Text>
      {reports.isError ? (
        <Banner tone="error" message={describeError(reports.error)} />
      ) : reports.data?.length === 0 ? (
        <Text variant="footnote" tone="muted">
          No reports.
        </Text>
      ) : (
        reports.data?.map((report) => (
          <View key={report.id} style={styles.item}>
            <Row
              label={when(report.createdAt)}
              value={REASON_LABELS[report.reason]}
            />
            {report.note ? <Row label="Note" value={report.note} /> : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  item: {
    gap: 2,
    paddingVertical: Spacing.sm,
  },
});
