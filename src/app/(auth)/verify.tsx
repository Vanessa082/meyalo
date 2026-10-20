import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SubmitField } from '@/components/supply/submit-field';
import { Button } from '@/components/ui/button';
import { InlineMessage } from '@/components/ui/inline-message';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useSendCode, useVerifyCode } from '@/hooks/use-account';
import { useMarkEnteredApp } from '@/hooks/use-discovery-profile';
import { useTranslation } from '@/i18n/locale-provider';
import { isAccountError } from '@/services/account';
import { pendingSignIn } from '@/services/pending-sign-in';
import { Spacing } from '@/theme';

/** Supabase lets a code be asked for again after 60 seconds. */
const RESEND_SECONDS = 60;

/** Enter the 6-digit code; the consent from the previous step is recorded. */
export default function VerifyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  // Read once: what "Send me a code" left in memory.
  const [pending] = useState(() => pendingSignIn.get());
  const verify = useVerifyCode();
  const markEntered = useMarkEnteredApp();
  const resend = useSendCode();
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  // Opened without the first step (a reload or an old link): start again.
  if (!pending) {
    return (
      <Page width="readable">
        <View style={styles.block}>
          <InlineMessage tone="info" message={t('account.startAgain')} />
          <Button
            title={t('account.signInTitle')}
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </View>
      </Page>
    );
  }

  const { email, consent, from } = pending;
  const submit = () =>
    verify.mutate(
      { email, code, consent },
      {
        onSuccess: () => {
          pendingSignIn.clear();
          if (from === 'welcome') {
            // A returning person: into the app, where the backup restores
            // their profile and plans.
            markEntered.mutate();
            router.replace('/(tabs)');
          } else {
            router.dismissTo('/(tabs)/you');
          }
          toast.show({ tone: 'success', message: t('account.signedIn') });
        },
      },
    );

  const kind = isAccountError(verify.error) ? verify.error.kind : null;
  const failure = verify.error
    ? kind === 'wrong_code'
      ? t('account.wrongCode')
      : kind === 'invalid_input'
        ? t('account.codeFormat')
        : kind === 'rate_limited'
          ? t('account.rateLimited')
          : t('account.verifyFailed')
    : null;

  return (
    <Page width="readable">
      <View style={styles.block}>
        <Text variant="title1" accessibilityRole="header">
          {t('account.verifyTitle')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('account.verifyBody', { email })}
        </Text>
        <SubmitField
          label={t('account.codeLabel')}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        {failure ? <InlineMessage tone="error" message={failure} /> : null}
        <Button
          title={t('account.verify')}
          size="large"
          fullWidth
          disabled={code.length !== 6}
          loading={verify.isPending}
          onPress={submit}
        />
        <Button
          title={
            wait > 0
              ? t('account.resendIn', { seconds: wait })
              : t('account.resend')
          }
          variant="ghost"
          disabled={wait > 0 || resend.isPending}
          onPress={() =>
            resend.mutate(email, {
              onSuccess: () => setWait(RESEND_SECONDS),
              onError: (error) =>
                toast.show({
                  tone: 'error',
                  message:
                    isAccountError(error) && error.kind === 'rate_limited'
                      ? t('account.rateLimited')
                      : t('account.sendFailed'),
                }),
            })
          }
        />
        <Text variant="footnote" tone="muted">
          {t('account.checkSpam')}
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.lg,
  },
});
