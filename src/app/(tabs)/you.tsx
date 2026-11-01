import { type Href, useRouter } from 'expo-router';
import {
  EyeOff,
  type LucideIcon,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  Sliders,
  Target,
} from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { AccountCard } from '@/components/account/account-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { Page, PageHeader } from '@/components/ui/page';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import {
  useDiscoveryProfile,
  useResetDiscoveryProfile,
} from '@/hooks/use-discovery-profile';
import { useHiddenEvents } from '@/hooks/use-hidden-events';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';

export default function YouScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: profile = null } = useDiscoveryProfile();
  const resetProfile = useResetDiscoveryProfile();
  const { data: hidden = [] } = useHiddenEvents();

  const handleResetProfile = () =>
    resetProfile.mutate(undefined, {
      onSuccess: () => router.replace('/(onboarding)/welcome'),
    });

  return (
    <Page>
      <PageHeader title={t('you.title')} subtitle={t('you.subtitle')} />

      <AccountCard />

      <Stack gap="md">
        <PreferenceRow
          icon={MapPin}
          label={t('you.location')}
          value={
            profile?.area?.kind === 'city'
              ? profile.area.city.name
              : profile?.area?.kind === 'online_only'
                ? t('you.onlineOnly')
                : t('you.notSet')
          }
          href="/(onboarding)/location"
        />
        <PreferenceRow
          icon={Sliders}
          label={t('you.interests')}
          value={
            profile?.interestIds?.length
              ? t('you.interestsCount', { count: profile.interestIds.length })
              : t('you.interestsNone')
          }
          href="/(onboarding)/interests"
        />
        <PreferenceRow
          icon={Target}
          label={t('you.goals')}
          value={
            profile?.goalIds?.length
              ? t('you.goalsCount', { count: profile.goalIds.length })
              : t('you.goalsNone')
          }
          href="/(onboarding)/goals"
        />
        <PreferenceRow
          icon={EyeOff}
          label={t('you.hidden')}
          value={
            hidden.length > 0
              ? t('you.hiddenCount', { count: hidden.length })
              : t('you.hiddenNone')
          }
          href="/hidden-events"
          action="view"
        />
        <PreferenceRow
          icon={ShieldCheck}
          label={t('you.privacy')}
          value={t('you.privacyValue')}
          href="/privacy-settings"
          action="view"
        />
      </Stack>

      <Stack gap="md" align="center">
        <Button
          title={t('submit.entry')}
          variant="primary"
          size="medium"
          icon={<Send size={16} color={colors.onPrimary} />}
          onPress={() => router.push('/submit')}
        />
        <Button
          title={t('you.reset')}
          variant="outline"
          size="medium"
          icon={<RefreshCw size={16} color={colors.primary} />}
          onPress={handleResetProfile}
        />
        <Text variant="footnote" tone="muted" align="center">
          {t('welcome.privacy')}
        </Text>
      </Stack>
    </Page>
  );
}

/** One editable discovery preference: icon, label, current value, Edit. */
function PreferenceRow({
  icon: Icon,
  label,
  value,
  href,
  action = 'edit',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href: Href;
  action?: 'edit' | 'view';
}) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Stack direction="row" gap="md" align="center">
        <IconCircle icon={Icon} />
        <Stack gap="xxs" style={styles.fill}>
          <Text variant="headline" accessibilityRole="header">
            {label}
          </Text>
          <Text variant="footnote" tone="muted">
            {value}
          </Text>
        </Stack>
        <Button
          title={t(action === 'edit' ? 'you.edit' : 'you.view')}
          accessibilityLabel={t(
            action === 'edit' ? 'you.editLabel' : 'you.viewLabel',
            { item: label },
          )}
          variant="ghost"
          size="small"
          onPress={() => router.push(href)}
        />
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
  },
});
