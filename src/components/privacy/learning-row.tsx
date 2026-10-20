import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Switch } from 'react-native';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import {
  useLearnFromActivity,
  useSetLearnFromActivity,
} from '@/hooks/use-learning';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';

/** "Learn from my activity": on-phone personalisation, with an off switch
 *  that also deletes the opened-events history. */
export function LearningRow() {
  const colors = useTheme();
  const { t } = useTranslation();
  const { data: on } = useLearnFromActivity();
  const setLearning = useSetLearnFromActivity();
  const value = setLearning.isPending ? !on : on;
  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Stack direction="row" gap="md" align="center">
        <IconCircle icon={Sparkles} />
        <Stack gap="xxs" style={styles.fill}>
          <Text variant="headline" accessibilityRole="header">
            {t('you.learning')}
          </Text>
          <Text variant="footnote" tone="muted">
            {on === false ? t('you.learningOff') : t('you.learningOn')}
          </Text>
        </Stack>
        <Switch
          value={value ?? false}
          disabled={on === undefined}
          onValueChange={(next) => setLearning.mutate(next)}
          accessibilityLabel={t('you.learningLabel')}
          trackColor={{ true: colors.primary, false: colors.border }}
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
