import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, Share, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { publicUrl } from '@/config/env';
import { useSetAttended, useSetNote } from '@/hooks/use-saved-events';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { NOTE_MAX, type SavedEntry } from '@/services/saved-events-store';
import { whatsAppUrl } from '@/services/share';
import { Radius, Spacing } from '@/theme';

interface DidYouGoProps {
  entry: SavedEntry;
  title: string;
}

/**
 * "Did you go?" after a planned event, then a private "What did you get out
 * of it?" note (docs/product-decisions.md, "Spec: after an event ends").
 * Answers and notes stay on the phone.
 */
export function DidYouGo({ entry, title }: DidYouGoProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const setAttended = useSetAttended();
  const setNote = useSetNote();
  const [draft, setDraft] = useState<string | null>(null);
  const failed = () =>
    toast.show({ tone: 'error', message: t('eventCard.saveFailed') });

  const answer = (attended: boolean | null) =>
    setAttended.mutate({ id: entry.id, attended }, { onError: failed });

  const saveNote = () => {
    if (draft === null) return;
    setNote.mutate(
      { id: entry.id, note: draft },
      { onSuccess: () => setDraft(null), onError: failed },
    );
  };

  const share = () => {
    const path = `/event/${entry.id}`;
    const link =
      publicUrl(path) ?? (Platform.OS === 'web' ? Linking.createURL(path) : '');
    const message = [
      t('past.shareText', { title, note: entry.note ?? '' }),
      link,
    ]
      .filter(Boolean)
      .join('\n');
    const shareFailed = () =>
      toast.show({ tone: 'error', message: t('eventDetail.shareFailed') });
    if (Platform.OS === 'web') {
      if (!window.open(whatsAppUrl(message), '_blank', 'noopener')) {
        shareFailed();
      }
      return;
    }
    Share.share({ message }).catch(shareFailed);
  };

  const change = (
    <Button
      title={t('past.change')}
      variant="ghost"
      size="small"
      onPress={() => answer(null)}
    />
  );

  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      {entry.attended === null ? (
        <Stack gap="sm">
          <Text variant="headline" accessibilityRole="header">
            {t('past.didYouGo')}
          </Text>
          <View style={styles.row} accessibilityRole="radiogroup">
            <Chip
              role="radio"
              label={t('past.yes')}
              selected={false}
              onPress={() => answer(true)}
            />
            <Chip
              role="radio"
              label={t('past.no')}
              selected={false}
              onPress={() => answer(false)}
            />
          </View>
        </Stack>
      ) : entry.attended === false ? (
        <Stack direction="row" gap="sm" align="center">
          <Text variant="callout" tone="muted" style={styles.fill}>
            {t('past.didNotGo')}
          </Text>
          {change}
        </Stack>
      ) : (
        <Stack gap="sm">
          <Stack direction="row" gap="sm" align="center">
            <Text variant="headline" style={styles.fill}>
              {t('past.went')}
            </Text>
            {change}
          </Stack>
          {draft !== null || !entry.note ? (
            <>
              <Text variant="callout">{t('past.noteLabel')}</Text>
              <TextInput
                value={draft ?? entry.note ?? ''}
                onChangeText={setDraft}
                maxLength={NOTE_MAX}
                multiline
                placeholder={t('past.notePlaceholder')}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t('past.noteLabel')}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              />
              <Text variant="footnote" tone="muted">
                {t('past.notePrivate')}
              </Text>
              <Stack direction="row" gap="sm" wrap>
                <Button
                  title={t('past.saveNote')}
                  size="small"
                  disabled={draft === null}
                  loading={setNote.isPending}
                  onPress={saveNote}
                />
                {draft !== null && entry.note ? (
                  <Button
                    title={t('past.cancel')}
                    variant="ghost"
                    size="small"
                    onPress={() => setDraft(null)}
                  />
                ) : null}
              </Stack>
            </>
          ) : (
            <>
              <Text variant="body">{entry.note}</Text>
              <Stack direction="row" gap="sm" wrap>
                <Button
                  title={t('past.share')}
                  variant="secondary"
                  size="small"
                  onPress={share}
                />
                <Button
                  title={t('past.editNote')}
                  variant="ghost"
                  size="small"
                  onPress={() => setDraft(entry.note ?? '')}
                />
              </Stack>
            </>
          )}
        </Stack>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  fill: {
    flex: 1,
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    textAlignVertical: 'top',
    fontSize: 16,
  },
});
