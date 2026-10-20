import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppleButton } from '@/components/account/apple-button';
import { ConsentBlock } from '@/components/consent/consent-block';
import { SubmitField } from '@/components/supply/submit-field';
import { Button } from '@/components/ui/button';
import { InlineMessage } from '@/components/ui/inline-message';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAppleSignIn, useSendCode } from '@/hooks/use-account';
import { useConsentForm } from '@/hooks/use-consent';
import { useMarkEnteredApp } from '@/hooks/use-discovery-profile';
import { useTranslation } from '@/i18n/locale-provider';
import { isAccountError, normalizeEmail } from '@/services/account';
import { pendingSignIn } from '@/services/pending-sign-in';
import { Spacing } from '@/theme';

/**
 * Sign in or create an account with a 6-digit email code (docs/
 * product-decisions.md, "Spec: accounts"). The consent box comes first:
 * nothing is sent until it is ticked.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { t } = useTranslation();
  const sendCode = useSendCode();
  const apple = useAppleSignIn();
  const markEntered = useMarkEnteredApp();
  const toast = useToast();
  const [needConsent, setNeedConsent] = useState(false);
  const consentForm = useConsentForm();
  const [email, setEmail] = useState('');
  const address = normalizeEmail(email);

  const send = () => {
    const { consent } = consentForm;
    if (!address || !consent) return;
    sendCode.mutate(address, {
      onSuccess: () => {
        consentForm.finish();
        pendingSignIn.set({
          email: address,
          consent,
          from: from === 'welcome' ? 'welcome' : null,
        });
        router.push('/(auth)/verify');
      },
    });
  };

  const continueWithApple = () => {
    const { consent } = consentForm;
    if (!consent) {
      setNeedConsent(true);
      return;
    }
    apple.mutate(consent, {
      onSuccess: (signedIn) => {
        if (!signedIn) return;
        consentForm.finish();
        if (from === 'welcome') {
          markEntered.mutate();
          router.replace('/(tabs)');
        } else {
          router.dismissTo('/(tabs)/you');
        }
        toast.show({ tone: 'success', message: t('account.signedIn') });
      },
    });
  };

  const kind = isAccountError(sendCode.error) ? sendCode.error.kind : null;
  const failure = sendCode.error
    ? kind === 'rate_limited'
      ? t('account.rateLimited')
      : kind === 'invalid_input'
        ? t('account.invalidEmail')
        : t('account.sendFailed')
    : null;

  return (
    <Page width="readable">
      <View style={styles.block}>
        <Text variant="title1" accessibilityRole="header">
          {t('account.signInTitle')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('account.signInBody')}
        </Text>
        <SubmitField
          label={t('account.emailLabel')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          inputMode="email"
          maxLength={254}
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <ConsentBlock kind="account" form={consentForm} />
        {failure ? <InlineMessage tone="error" message={failure} /> : null}
        {needConsent && !consentForm.consent ? (
          <InlineMessage tone="info" message={t('consent.required')} />
        ) : null}
        {apple.error ? (
          <InlineMessage tone="error" message={t('account.appleFailed')} />
        ) : null}
        <Button
          title={t('account.sendCode')}
          size="large"
          fullWidth
          disabled={!address || !consentForm.consent}
          loading={sendCode.isPending}
          onPress={send}
        />
        <AppleButton onPress={continueWithApple} />
        <Text variant="footnote" tone="muted">
          {t('account.optional')}
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
