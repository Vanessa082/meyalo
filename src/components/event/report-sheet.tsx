import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConsentBlock } from '@/components/consent/consent-block';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { InlineMessage } from '@/components/ui/inline-message';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useConsentForm } from '@/hooks/use-consent';
import { useIsOnline } from '@/hooks/use-online';
import { useReportEvent } from '@/hooks/use-report-event';
import { useTheme } from '@/hooks/use-theme';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import { isEventRepositoryError } from '@/services/event-repository';
import { Radius, Spacing } from '@/theme';
import {
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  type ReportReason,
} from '@/types/event.type';

interface ReportSheetProps {
  eventId: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * Report a problem with an event. Success is confirmed only after the
 * database accepted the report; a failure keeps the sheet open with the
 * user's input so they can retry.
 */
export function ReportSheet({ eventId, visible, onClose }: ReportSheetProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const toast = useToast();
  const report = useReportEvent();
  const online = useIsOnline();
  const consentForm = useConsentForm();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  // One id per report, kept across retries so the database can tell a
  // re-send of a report it already saved from a new one.
  const [requestId, setRequestId] = useState(() => Crypto.randomUUID());

  const close = () => {
    if (report.isPending && !report.isPaused) return;
    report.reset();
    onClose();
  };

  const send = () => {
    const { consent } = consentForm;
    if (!reason || !consent) return;
    const input = {
      eventId,
      reason,
      note,
      clientRequestId: requestId,
      consent,
    };
    if (!online) {
      // Queued: it pauses now and is sent when the network returns.
      report.mutate(input);
      consentForm.finish();
      setReason(null);
      setNote('');
      setRequestId(Crypto.randomUUID());
      onClose();
      toast.show({ tone: 'info', message: t('offline.reportQueued') });
      return;
    }
    report.mutate(input, {
      onSuccess: () => {
        consentForm.finish();
        setReason(null);
        setNote('');
        setRequestId(Crypto.randomUUID());
        report.reset();
        onClose();
        toast.show({ tone: 'success', message: t('report.sent') });
      },
    });
  };

  const kind = isEventRepositoryError(report.error) ? report.error.kind : null;
  const failure = report.error
    ? kind === 'invalid_input'
      ? t('report.failedInvalid')
      : kind === 'rate_limited'
        ? t('report.failedRateLimited')
        : t('report.failed')
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('report.cancel')}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text variant="title2" accessibilityRole="header">
              {t('report.title')}
            </Text>
            <Text variant="callout" tone="muted">
              {t('report.body')}
            </Text>

            <Text variant="headline">{t('report.reasonLabel')}</Text>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {REPORT_REASONS.map((id) => (
                <Chip
                  key={id}
                  role="radio"
                  label={t(`report.reasons.${id}` as TxKeyPath)}
                  selected={reason === id}
                  onPress={() => setReason(id)}
                />
              ))}
            </View>

            <Text variant="headline">{t('report.noteLabel')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={REPORT_NOTE_MAX}
              multiline
              placeholder={t('report.notePlaceholder')}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('report.noteLabel')}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            />
            <Text variant="footnote" tone="muted" align="right">
              {t('report.noteCount', {
                count: note.length,
                max: REPORT_NOTE_MAX,
              })}
            </Text>

            <ConsentBlock kind="report" form={consentForm} onLeave={close} />

            {failure ? <InlineMessage tone="error" message={failure} /> : null}

            <Button
              title={t('report.send')}
              onPress={send}
              disabled={!reason || !consentForm.consent}
              loading={report.isPending}
              fullWidth
            />
            <Button
              title={t('report.cancel')}
              variant="ghost"
              onPress={close}
              disabled={report.isPending}
              fullWidth
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    textAlignVertical: 'top',
    // 16px stops iOS from zooming into the field on focus.
    fontSize: 16,
  },
});
