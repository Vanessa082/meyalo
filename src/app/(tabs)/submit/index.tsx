import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { ConsentBlock } from '@/components/consent/consent-block';
import { SubmitField } from '@/components/supply/submit-field';
import { Button } from '@/components/ui/button';
import { InlineMessage } from '@/components/ui/inline-message';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { publicUrl } from '@/config/env';
import { useConsentForm } from '@/hooks/use-consent';
import { useSubmitEvent } from '@/hooks/use-supply';
import { useTranslation } from '@/i18n/locale-provider';
import { isSupplyError } from '@/services/supply';
import { Spacing } from '@/theme';

/** Public, no account: anyone can suggest an event for curators to check. */
export default function SubmitScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const submit = useSubmitEvent();
  const consentForm = useConsentForm();
  const [sourceUrl, setSourceUrl] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');

  const sent = submit.data;
  const statusPath = sent ? `/submit/${sent.id}?token=${sent.token}` : null;
  // A shareable https link when the site address is configured; otherwise a
  // link that opens this app or page.
  const statusLink = statusPath
    ? (publicUrl(statusPath) ?? Linking.createURL(statusPath))
    : null;

  const error = submit.error
    ? isSupplyError(submit.error) && submit.error.kind === 'invalid_input'
      ? submit.error.message
      : isSupplyError(submit.error) && submit.error.kind === 'rate_limited'
        ? t('submit.rateLimited')
        : t('submit.failed')
    : null;

  const reset = () => {
    submit.reset();
    setSourceUrl('');
    setDescription('');
    setNote('');
  };

  return (
    <Page width="readable">
      <Text variant="title1" accessibilityRole="header">
        {t('submit.title')}
      </Text>

      {sent && statusLink ? (
        <View style={styles.block}>
          <InlineMessage tone="info" message={t('submit.sentTitle')} />
          <Text variant="body">{t('submit.sentBody')}</Text>
          <Text variant="callout" selectable style={styles.link}>
            {statusLink}
          </Text>
          <Button
            title={t('submit.shareLink')}
            onPress={() =>
              Share.share({ message: statusLink }).catch(() => {
                // No share sheet (some browsers): the link above stays
                // visible and selectable, so nothing is lost.
              })
            }
          />
          <Button
            title={t('submit.openStatus')}
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/submit/[id]',
                params: { id: sent.id, token: sent.token },
              })
            }
          />
          <Button
            title={t('submit.suggestAnother')}
            variant="ghost"
            onPress={reset}
          />
        </View>
      ) : (
        <View style={styles.block}>
          <Text variant="body" tone="secondary">
            {t('submit.intro')}
          </Text>
          <InlineMessage tone="info" message={t('submit.whatQualifies')} />
          <SubmitField
            label={t('submit.linkLabel')}
            hint={t('submit.linkHint')}
            placeholder="https://"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            value={sourceUrl}
            onChangeText={setSourceUrl}
          />
          <SubmitField
            label={t('submit.descriptionLabel')}
            hint={t('submit.descriptionHint')}
            multiline
            maxLength={5000}
            value={description}
            onChangeText={setDescription}
          />
          <SubmitField
            label={t('submit.noteLabel')}
            multiline
            maxLength={1000}
            value={note}
            onChangeText={setNote}
          />
          <Text variant="footnote" tone="muted">
            {t('submit.privacy')}
          </Text>
          <ConsentBlock kind="suggestion" form={consentForm} />
          {error ? <InlineMessage tone="error" message={error} /> : null}
          <Button
            title={t('submit.send')}
            size="large"
            fullWidth
            loading={submit.isPending}
            disabled={!consentForm.consent}
            onPress={() => {
              const { consent } = consentForm;
              if (!consent) return;
              submit.mutate(
                { sourceUrl, description, note, consent },
                { onSuccess: consentForm.finish },
              );
            }}
          />
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.lg,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
