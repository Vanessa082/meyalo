import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ConsentBlock } from '@/components/consent/consent-block';
import { SubmitField } from '@/components/supply/submit-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { InlineMessage } from '@/components/ui/inline-message';
import { Page } from '@/components/ui/page';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useConsentForm } from '@/hooks/use-consent';
import {
  usePublicFriendPlan,
  useRespondToFriendPlan,
  useWithdrawFriendAnswer,
} from '@/hooks/use-friend-plans';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import { deviceStorage } from '@/lib/device-storage';
import { formatEventDate } from '@/services/event-mapping';
import {
  createFriendAnswersStore,
  type MyFriendAnswer,
} from '@/services/friend-answers-store';
import { type FriendAnswer, isFriendPlanError } from '@/services/friend-plans';
import { Spacing } from '@/theme';

const myAnswers = createFriendAnswersStore(deviceStorage);

/** A private page: a plain title, and never indexed by search engines. */
function PrivateHead() {
  const { t } = useTranslation();
  return (
    <Head>
      <title>{`${t('friendPage.pageTitle')} · Meyalo`}</title>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
  );
}
const ANSWERS: readonly FriendAnswer[] = ['in', 'maybe', 'cant'];
const ANSWER_LABEL: Record<FriendAnswer, TxKeyPath> = {
  in: 'friends.in',
  maybe: 'friends.maybe',
  cant: 'friends.cant',
};

/**
 * A friend's page for a plan (Feature 13): no app or account. They see the
 * event, who invited them, how many are coming (names only if the owner
 * shows them), and answer with a first name after the consent box.
 */
export default function FriendPlanScreen() {
  const { token = '' } = useLocalSearchParams<{ token: string }>();
  const i18n = useTranslation();
  const { t } = i18n;
  const toast = useToast();
  const plan = usePublicFriendPlan(token);
  const respond = useRespondToFriendPlan(token);
  const withdraw = useWithdrawFriendAnswer(token);
  const consentForm = useConsentForm();
  const [mine, setMine] = useState<MyFriendAnswer | null>(null);
  const [firstName, setFirstName] = useState('');
  const [answer, setAnswer] = useState<FriendAnswer | null>(null);

  useEffect(() => {
    myAnswers
      .get(token)
      .then((stored) => {
        setMine(stored);
        if (stored) {
          setFirstName(stored.firstName);
          setAnswer(stored.answer);
        }
      })
      .catch(() => setMine(null));
  }, [token]);

  if (plan.isPending) {
    return (
      <Page width="readable">
        <PrivateHead />
        <Text variant="callout" tone="muted">
          {t('friendPage.loading')}
        </Text>
      </Page>
    );
  }
  if (plan.isError) {
    return (
      <Page width="readable">
        <PrivateHead />
        <InlineMessage
          tone="error"
          message={t('friendPage.loadFailed')}
          actionLabel={t('eventDetail.retry')}
          onAction={() => plan.refetch()}
        />
      </Page>
    );
  }
  const data = plan.data;
  if (!data) {
    return (
      <Page width="readable">
        <PrivateHead />
        <Text variant="title1" accessibilityRole="header">
          {t('friendPage.goneTitle')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('friendPage.goneBody')}
        </Text>
      </Page>
    );
  }

  const send = () => {
    const { consent } = consentForm;
    if (!answer || !consent) return;
    respond.mutate(
      {
        firstName,
        answer,
        consent,
        responseToken: mine?.responseToken ?? null,
      },
      {
        onSuccess: async (responseToken) => {
          const saved = { responseToken, firstName: firstName.trim(), answer };
          setMine(saved);
          consentForm.finish();
          await myAnswers.set(token, saved).catch(() => {});
          toast.show({ tone: 'success', message: t('friendPage.sent') });
        },
      },
    );
  };

  const removeMine = () => {
    if (!mine) return;
    withdraw.mutate(mine.responseToken, {
      onSuccess: async () => {
        setMine(null);
        setAnswer(null);
        await myAnswers.remove(token).catch(() => {});
        toast.show({ tone: 'info', message: t('friendPage.removed') });
      },
      onError: () =>
        toast.show({ tone: 'error', message: t('friendPage.failed') }),
    });
  };

  const kind = isFriendPlanError(respond.error) ? respond.error.kind : null;
  const failure = respond.error
    ? kind === 'rate_limited'
      ? t('friendPage.rateLimited')
      : kind === 'invalid'
        ? t('friendPage.notOpen')
        : t('friendPage.failed')
    : null;
  const place =
    data.format === 'virtual'
      ? t('eventCard.online')
      : [data.venue_name, data.city].filter(Boolean).join(', ');

  return (
    <Page width="readable">
      <PrivateHead />
      <View style={styles.block}>
        <Text variant="callout" tone="muted">
          {data.owner_name
            ? t('friendPage.invitedBy', { name: data.owner_name })
            : t('friendPage.invited')}
        </Text>
        <Text variant="title1" accessibilityRole="header">
          {data.title}
        </Text>
        <Text variant="body">
          {formatEventDate(data.start_at, data.timezone, i18n)}
        </Text>
        {place ? (
          <Text variant="callout" tone="muted">
            {place}
          </Text>
        ) : null}

        <Card variant="outlined" padding="md" style={styles.card}>
          <Stack gap="sm">
            <Text variant="headline">{t('friends.counts', data.counts)}</Text>
            {data.names && data.names.length > 0
              ? data.names.map((person, index) => (
                  <Text
                    // Names may repeat; the order is stable (by answer time).
                    // biome-ignore lint/suspicious/noArrayIndexKey: no id is exposed to friends
                    key={`${person.name}-${index}`}
                    variant="callout"
                  >
                    {person.name}: {t(ANSWER_LABEL[person.answer])}
                  </Text>
                ))
              : null}
          </Stack>
        </Card>

        {data.status === 'closed' ? (
          <InlineMessage tone="info" message={t('friendPage.closed')} />
        ) : (
          <>
            {mine ? (
              <InlineMessage
                tone="info"
                message={t('friendPage.youAnswered', {
                  answer: t(ANSWER_LABEL[mine.answer]),
                })}
              />
            ) : null}
            <SubmitField
              label={t('friendPage.nameLabel')}
              value={firstName}
              onChangeText={setFirstName}
              maxLength={40}
              autoComplete="given-name"
            />
            <View style={styles.chips} accessibilityRole="radiogroup">
              {ANSWERS.map((option) => (
                <Chip
                  key={option}
                  role="radio"
                  label={t(ANSWER_LABEL[option])}
                  selected={answer === option}
                  onPress={() => setAnswer(option)}
                />
              ))}
            </View>
            <ConsentBlock
              kind="response"
              form={consentForm}
              note={data.show_names ? t('consent.responseVisible') : undefined}
            />
            {failure ? <InlineMessage tone="error" message={failure} /> : null}
            <Button
              title={mine ? t('friendPage.update') : t('friendPage.send')}
              size="large"
              fullWidth
              disabled={
                !answer || firstName.trim() === '' || !consentForm.consent
              }
              loading={respond.isPending}
              onPress={send}
            />
            {mine ? (
              <Button
                title={t('friendPage.remove')}
                variant="ghost"
                loading={withdraw.isPending}
                onPress={removeMine}
              />
            ) : null}
          </>
        )}
        <Text variant="footnote" tone="muted">
          {t('friendPage.noAccount')}
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.lg,
  },
  card: {
    borderWidth: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
