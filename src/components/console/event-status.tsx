import { StyleSheet, View } from 'react-native';
import {
  completenessIssues,
  type Freshness,
  freshness,
  PUBLICATION_LABELS,
  VERIFICATION_LABELS,
} from '@/services/event-domain';
import { instantToWallTime } from '@/services/zoned-time';
import type { Event } from '@/types/event.type';
import { Badge } from './console-ui';

/** Event time in its own timezone, with the zone named. */
export function eventTime(iso: string | null, timezone: string | null): string {
  if (!iso) return 'Not stated';
  const zone = timezone ?? 'UTC';
  return `${instantToWallTime(iso, zone)} (${zone})`;
}

const FRESHNESS_BADGES: Record<
  Freshness['kind'],
  {
    label: string;
    tone: 'neutral' | 'positive' | 'warning' | 'critical';
  } | null
> = {
  not_applicable: null,
  not_reviewed: null,
  never_checked: { label: 'Never checked', tone: 'warning' },
  stale: { label: 'Check is 14+ days old', tone: 'critical' },
  recheck_due: {
    label: 'Re-check due (starts within 7 days)',
    tone: 'warning',
  },
  fresh: null,
};

export function freshnessBadge(event: Event, now: Date = new Date()) {
  return FRESHNESS_BADGES[freshness(event, now).kind];
}

export function EventStatusBadges({ event }: { event: Event }) {
  const stale = freshnessBadge(event);
  const issues = completenessIssues(event).length;
  return (
    <View style={styles.badges}>
      <Badge
        label={PUBLICATION_LABELS[event.publicationStatus]}
        tone={
          event.publicationStatus === 'published'
            ? 'positive'
            : event.publicationStatus === 'cancelled'
              ? 'critical'
              : 'neutral'
        }
      />
      <Badge
        label={VERIFICATION_LABELS[event.verificationState]}
        tone={event.verificationState === 'unreviewed' ? 'warning' : 'positive'}
      />
      {stale ? <Badge label={stale.label} tone={stale.tone} /> : null}
      {issues > 0 ? (
        <Badge
          label={`${issues} missing ${issues === 1 ? 'detail' : 'details'}`}
          tone="neutral"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
