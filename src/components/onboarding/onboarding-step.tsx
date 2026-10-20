import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { InlineMessage } from '@/components/ui/inline-message';
import { StepProgress } from '@/components/ui/step-progress';
import { Text } from '@/components/ui/text';
import { useGutter } from '@/hooks/use-gutter';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { Layout, Spacing } from '@/theme';

export const ONBOARDING_STEPS = 3;

export interface OnboardingStepProps {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** "Skip" when nothing is selected, "Continue" otherwise. */
  hasSelection: boolean;
  onAdvance: () => void;
  saving: boolean;
  saveError: boolean;
  onBack: () => void;
  footnote?: string;
}

export function OnboardingStep({
  step,
  title,
  subtitle,
  children,
  hasSelection,
  onAdvance,
  saving,
  saveError,
  onBack,
  footnote,
}: OnboardingStepProps) {
  const colors = useTheme();
  const gutter = useGutter();
  const { t } = useTranslation();
  const progress = t('onboarding.progress', {
    current: step,
    total: ONBOARDING_STEPS,
  });

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.column, styles.header, { paddingRight: gutter }]}>
          <View style={{ paddingLeft: gutter - Spacing.sm }}>
            <IconButton
              icon={<ChevronLeft size={24} color={colors.text} />}
              accessibilityLabel={t('common.back')}
              onPress={onBack}
            />
          </View>
          <StepProgress
            current={step}
            total={ONBOARDING_STEPS}
            label={progress}
          />
        </View>

        <ScrollView
          style={styles.root}
          contentContainerStyle={[
            styles.column,
            styles.content,
            { paddingHorizontal: gutter },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.heading}>
            <Text variant="title1" accessibilityRole="header">
              {title}
            </Text>
            <Text variant="body" tone="muted">
              {subtitle}
            </Text>
          </View>
          {children}
        </ScrollView>

        <View
          style={[styles.footerBar, { borderTopColor: colors.borderSubtle }]}
        >
          <View
            style={[
              styles.column,
              styles.footer,
              { paddingHorizontal: gutter },
            ]}
          >
            {saveError ? (
              <InlineMessage tone="error" message={t('onboarding.saveError')} />
            ) : null}
            <Button
              title={
                hasSelection ? t('onboarding.continue') : t('onboarding.skip')
              }
              variant={hasSelection ? 'primary' : 'secondary'}
              size="large"
              fullWidth
              loading={saving}
              onPress={onAdvance}
              testID="onboarding-advance"
            />
            {footnote ? (
              <Text variant="footnote" tone="muted" align="center">
                {footnote}
              </Text>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ChoiceGroup({
  label,
  single = false,
  children,
}: {
  label: string;
  /** Single choice (radio group) rather than multi-select. */
  single?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text variant="caption" tone="muted" importantForAccessibility="no">
        {label}
      </Text>
      <View
        role={single ? 'radiogroup' : 'group'}
        aria-label={label}
        style={styles.chips}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: Layout.readableWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  content: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Layout.sectionGap - Spacing.xs,
  },
  heading: {
    gap: Spacing.sm,
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  group: {
    gap: Spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
