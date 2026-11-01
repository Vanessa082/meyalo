import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useRecordCheck } from '@/hooks/use-curation';
import {
  CHECK_METHOD_LABELS,
  CHECK_RESULT_LABELS,
  checkInputProblem,
  RED_FLAG_LABELS,
} from '@/services/event-domain';
import { Spacing } from '@/theme';
import {
  type CheckMethod,
  type Event,
  RED_FLAGS,
  type RedFlag,
  type VerificationState,
} from '@/types/event.type';
import { Banner, Choices, describeError, Field } from './console-ui';

const DECISIONS: { value: VerificationState; label: string }[] = [
  { value: 'source_confirmed', label: 'Confirm against the source' },
  { value: 'organizer_confirmed', label: 'Confirmed with the organizer' },
  { value: 'unreviewed', label: 'Reject' },
];

const METHODS = (Object.keys(CHECK_METHOD_LABELS) as CheckMethod[]).map(
  (value) => ({ value, label: CHECK_METHOD_LABELS[value] }),
);

const FLAGS = RED_FLAGS.map((value) => ({
  value,
  label: RED_FLAG_LABELS[value],
}));

/**
 * Every verification goes through here: the curator states how they checked,
 * links the evidence, and answers the scam questions. The database
 * (record_check) enforces the same rules.
 */
export function CheckForm({ event }: { event: Event }) {
  const record = useRecordCheck(event);
  const [state, setState] = useState<VerificationState | null>(null);
  const [method, setMethod] = useState<CheckMethod | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState(event.sourceUrl);
  const [chargesFee, setChargesFee] = useState<boolean | null>(null);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [notes, setNotes] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = () => {
    if (!state || !method || chargesFee === null) {
      setProblem(
        'Choose a decision, how you checked, and whether it charges a fee.',
      );
      return;
    }
    const check = {
      state,
      method,
      evidenceUrl,
      redFlags,
      chargesFee,
      notes: notes.trim() || null,
    };
    const found = checkInputProblem({ ...check, eventId: event.id });
    setProblem(found);
    if (found) return;
    record.mutate(check, {
      onSuccess: () => {
        setState(null);
        setMethod(null);
        setChargesFee(null);
        setRedFlags([]);
        setNotes('');
      },
    });
  };

  return (
    <View style={styles.container}>
      <Choices
        label="Decision"
        options={DECISIONS}
        selected={state ? [state] : []}
        onToggle={(value) => setState(value)}
      />
      <Choices
        label="How you checked"
        options={METHODS}
        selected={method ? [method] : []}
        onToggle={(value) => setMethod(value)}
      />
      <Field
        label="Evidence link"
        hint="The official page, post or message you checked against (https)."
        keyboardType="url"
        value={evidenceUrl}
        onChangeText={setEvidenceUrl}
      />
      <Choices
        label="Does it charge people a fee to apply or register?"
        options={[
          { value: 'yes', label: 'Yes, a fee' },
          { value: 'no', label: 'No fee' },
        ]}
        selected={chargesFee === null ? [] : [chargesFee ? 'yes' : 'no']}
        onToggle={(value) => setChargesFee(value === 'yes')}
      />
      <Choices
        label="Red flags seen (any flag means it cannot be confirmed)"
        options={FLAGS}
        selected={redFlags}
        onToggle={(value) =>
          setRedFlags((current) =>
            current.includes(value)
              ? current.filter((flag) => flag !== value)
              : [...current, value],
          )
        }
      />
      <Field
        label="Notes (optional)"
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      {problem ? <Banner tone="error" message={problem} /> : null}
      {record.error ? (
        <Banner tone="error" message={describeError(record.error)} />
      ) : null}
      {record.data ? (
        <Banner
          tone={record.data.result === 'confirmed' ? 'success' : 'info'}
          message={CHECK_RESULT_LABELS[record.data.result]}
        />
      ) : null}

      <Button
        title="Record check"
        onPress={submit}
        loading={record.isPending}
      />
      <Text variant="footnote" tone="muted">
        Compare title, date and time, place, format, price and links with the
        evidence before recording. Fee-charging events need a second curator.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
});
