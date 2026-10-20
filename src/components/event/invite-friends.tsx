import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Share, StyleSheet, Switch, View } from 'react-native';
import { SubmitField } from '@/components/supply/submit-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { InlineMessage } from '@/components/ui/inline-message';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { publicUrl } from '@/config/env';
import { useAccountSession } from '@/hooks/use-account';
import {
  useCreateFriendPlan,
  useDeleteFriendPlan,
  useOwnFriendPlan,
  useUpdateFriendPlan,
} from '@/hooks/use-friend-plans';
import { useTheme } from '@/hooks/use-theme';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import {
  type FriendAnswer,
  isFriendPlanError,
  type OwnFriendPlan,
} from '@/services/friend-plans';
import { whatsAppUrl } from '@/services/share';
import { Spacing } from '@/theme';

const ANSWER_LABEL: Record<FriendAnswer, TxKeyPath> = {
  in: 'friends.in',
  maybe: 'friends.maybe',
  cant: 'friends.cant',
};

/** A link a friend can open: the public site, or this web page's own. */
function planLink(token: string): string | null {
  const path = `/plan/${token}`;
  return (
    publicUrl(path) ?? (Platform.OS === 'web' ? Linking.createURL(path) : null)
  );
}

/**
 * Plans with friends, owner side (Feature 13): on a Going event that has not
 * ended. Signing in is required to invite; friends answer without an account.
 */
export function InviteFriends({
  eventId,
  title,
}: {
  eventId: string;
  title: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session } = useAccountSession();
  const plan = useOwnFriendPlan(eventId, Boolean(session));

  if (!session) {
    return (
      <Card variant="outlined" padding="md" style={styles.card}>
        <Stack gap="sm">
          <Header title={t('friends.title')} body={t('friends.signInBody')} />
          <Button
            title={t('friends.signIn')}
            size="small"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </Stack>
      </Card>
    );
  }
  if (plan.isPending) return null;
  if (plan.isError) {
    return (
      <InlineMessage
        tone="error"
        message={t('friends.loadFailed')}
        actionLabel={t('eventDetail.retry')}
        onAction={() => plan.refetch()}
      />
    );
  }
  return plan.data ? (
    <PlanCard eventId={eventId} title={title} plan={plan.data} />
  ) : (
    <CreateCard eventId={eventId} title={title} />
  );
}

function Header({ title, body }: { title: string; body: string }) {
  return (
    <Stack direction="row" gap="md" align="center">
      <IconCircle icon={Users} />
      <Stack gap="xxs" style={styles.fill}>
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="footnote" tone="muted">
          {body}
        </Text>
      </Stack>
    </Stack>
  );
}

function useShare(title: string) {
  const { t } = useTranslation();
  const toast = useToast();
  return (token: string) => {
    const link = planLink(token);
    if (!link) {
      toast.show({ tone: 'info', message: t('friends.noLink') });
      return;
    }
    const message = t('friends.shareText', { title, link });
    const failed = () =>
      toast.show({ tone: 'error', message: t('eventDetail.shareFailed') });
    if (Platform.OS === 'web') {
      if (!window.open(whatsAppUrl(message), '_blank', 'noopener')) failed();
      return;
    }
    Linking.openURL(whatsAppUrl(message)).catch(() =>
      Share.share({ message }).catch(failed),
    );
  };
}

function NamesSwitch({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const colors = useTheme();
  const { t } = useTranslation();
  return (
    <Stack direction="row" gap="md" align="center">
      <Stack gap="xxs" style={styles.fill}>
        <Text variant="callout">{t('friends.showNames')}</Text>
        <Text variant="footnote" tone="muted">
          {value ? t('friends.showNamesOn') : t('friends.showNamesOff')}
        </Text>
      </Stack>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={t('friends.showNames')}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </Stack>
  );
}

function CreateCard({ eventId, title }: { eventId: string; title: string }) {
  const { t } = useTranslation();
  const create = useCreateFriendPlan(eventId);
  const share = useShare(title);
  const [name, setName] = useState('');
  const [showNames, setShowNames] = useState(false);

  const kind = isFriendPlanError(create.error) ? create.error.kind : null;
  const failure = create.error
    ? kind === 'rate_limited'
      ? t('friends.rateLimited')
      : kind === 'not_signed_in'
        ? t('friends.consentMissing')
        : t('friends.createFailed')
    : null;

  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Stack gap="md">
        <Header title={t('friends.title')} body={t('friends.body')} />
        <SubmitField
          label={t('friends.nameLabel')}
          hint={t('friends.nameHint')}
          value={name}
          onChangeText={setName}
          maxLength={40}
          autoComplete="given-name"
        />
        <NamesSwitch value={showNames} onChange={setShowNames} />
        {failure ? <InlineMessage tone="error" message={failure} /> : null}
        <Button
          title={t('friends.create')}
          loading={create.isPending}
          onPress={() =>
            create.mutate(
              { ownerName: name, showNames },
              { onSuccess: (plan) => share(plan.token) },
            )
          }
        />
      </Stack>
    </Card>
  );
}

function PlanCard({
  eventId,
  title,
  plan,
}: {
  eventId: string;
  title: string;
  plan: OwnFriendPlan;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const update = useUpdateFriendPlan(eventId);
  const remove = useDeleteFriendPlan(eventId);
  const share = useShare(title);
  const [confirming, setConfirming] = useState(false);
  const failed = () =>
    toast.show({ tone: 'error', message: t('friends.changeFailed') });

  const counts = { in: 0, maybe: 0, cant: 0 };
  for (const response of plan.responses) counts[response.answer] += 1;

  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Stack gap="md">
        <Header
          title={t('friends.yourPlan')}
          body={t('friends.counts', counts)}
        />
        {plan.responses.length > 0 ? (
          <View style={styles.names}>
            {plan.responses.map((response) => (
              <Text key={response.id} variant="callout">
                {response.first_name}: {t(ANSWER_LABEL[response.answer])}
              </Text>
            ))}
          </View>
        ) : (
          <Text variant="footnote" tone="muted">
            {t('friends.noAnswers')}
          </Text>
        )}
        <NamesSwitch
          value={plan.show_names}
          disabled={update.isPending}
          onChange={(next) =>
            update.mutate(
              { planId: plan.id, change: { show_names: next } },
              { onError: failed },
            )
          }
        />
        {plan.closed ? (
          <InlineMessage tone="info" message={t('friends.closedNote')} />
        ) : null}
        <Stack direction="row" gap="sm" wrap>
          {plan.closed ? null : (
            <Button
              title={t('friends.shareAgain')}
              size="small"
              onPress={() => share(plan.token)}
            />
          )}
          <Button
            title={plan.closed ? t('friends.reopen') : t('friends.close')}
            variant="ghost"
            size="small"
            onPress={() =>
              update.mutate(
                { planId: plan.id, change: { closed: !plan.closed } },
                { onError: failed },
              )
            }
          />
          {confirming ? null : (
            <Button
              title={t('friends.delete')}
              variant="ghost"
              size="small"
              onPress={() => setConfirming(true)}
            />
          )}
        </Stack>
        {confirming ? (
          <Stack gap="sm">
            <InlineMessage
              tone="warning"
              message={t('friends.deleteConfirm')}
            />
            <Stack direction="row" gap="sm" wrap>
              <Button
                title={t('friends.deleteYes')}
                size="small"
                loading={remove.isPending}
                onPress={() =>
                  remove.mutate(plan.id, {
                    onSuccess: () => setConfirming(false),
                    onError: failed,
                  })
                }
              />
              <Button
                title={t('friends.deleteNo')}
                variant="ghost"
                size="small"
                onPress={() => setConfirming(false)}
              />
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  fill: {
    flex: 1,
  },
  names: {
    gap: Spacing.xs,
  },
});
