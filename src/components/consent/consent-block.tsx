import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import type { ConsentForm } from '@/hooks/use-consent';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { Radius, Spacing } from '@/theme';
import { AGE_GROUPS, type AgeGroup } from '@/types/consent.type';

interface ConsentBlockProps {
  /** What is being sent, which changes the first sentence. */
  kind: 'report' | 'suggestion' | 'account';
  form: ConsentForm;
  /** Called before opening the Privacy Policy, e.g. to close a sheet. */
  onLeave?: () => void;
}

const NOTICE = {
  report: 'consent.reportNotice',
  suggestion: 'consent.suggestionNotice',
  account: 'consent.accountNotice',
} as const;

const AGE_LABEL = {
  '18_plus': 'consent.age18Plus',
  under_18: 'consent.ageUnder18',
} as const satisfies Record<AgeGroup, string>;

/**
 * The consent box at the end of anything sent to our server (docs/
 * product-decisions.md, "Spec: consent, privacy settings and
 * notifications"): what is sent, why, where it is stored, for how long and
 * how to have it deleted, then unticked boxes. The age group is asked once
 * and remembered on the phone.
 */
export function ConsentBlock({ kind, form, onLeave }: ConsentBlockProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const remembered = form.remembered ? form.ageGroup : null;

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text variant="headline" accessibilityRole="header">
        {t('consent.title')}
      </Text>
      <Text variant="footnote" tone="muted">
        {t(NOTICE[kind])}{' '}
        {kind === 'account' ? null : `${t('consent.signedIn')} `}
        {t('consent.storage')} {t('consent.deletion')}
      </Text>
      <Button
        title={t('consent.privacyPolicy')}
        variant="ghost"
        size="small"
        onPress={() => {
          onLeave?.();
          router.push('/privacy');
        }}
      />

      {remembered ? (
        <View style={styles.row}>
          <Text variant="callout" style={styles.fill}>
            {t('consent.ageRemembered', {
              group: t(AGE_LABEL[remembered]),
            })}
          </Text>
          <Button
            title={t('consent.change')}
            variant="ghost"
            size="small"
            // Unfolds the choice with the current answer selected.
            onPress={() => remembered && form.setAgeGroup(remembered)}
          />
        </View>
      ) : (
        <>
          <Text variant="callout">{t('consent.ageLabel')}</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {AGE_GROUPS.map((group) => (
              <Chip
                key={group}
                role="radio"
                label={t(AGE_LABEL[group])}
                selected={form.ageGroup === group}
                onPress={() => form.setAgeGroup(group)}
              />
            ))}
          </View>
        </>
      )}

      <Checkbox
        label={t(kind === 'account' ? 'consent.agreeAccount' : 'consent.agree')}
        checked={form.agreed}
        onChange={form.setAgreed}
      />
      {form.ageGroup === 'under_18' ? (
        <Checkbox
          label={t('consent.guardian')}
          checked={form.guardian}
          onChange={form.setGuardian}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fill: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
