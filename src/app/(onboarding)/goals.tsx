import { useRouter } from 'expo-router';
import {
  ChoiceGroup,
  OnboardingStep,
} from '@/components/onboarding/onboarding-step';
import { useOnboardingBack } from '@/components/onboarding/use-onboarding-step';
import { useSelection } from '@/components/onboarding/use-selection';
import { Chip } from '@/components/ui/chip';
import { GOAL_IDS, type GoalId } from '@/config/discovery/goals';
import {
  useCompleteOnboarding,
  useDiscoveryProfile,
} from '@/hooks/use-discovery-profile';
import { useTranslation } from '@/i18n/locale-provider';

export default function GoalsScreen() {
  const { data: profile, isPending } = useDiscoveryProfile();
  if (isPending) return null;
  return <GoalsStep initial={profile?.goalIds ?? []} />;
}

function GoalsStep({ initial }: { initial: GoalId[] }) {
  const router = useRouter();
  const { t } = useTranslation();
  const onBack = useOnboardingBack('/(onboarding)/interests');
  const complete = useCompleteOnboarding();
  const { selected, toggle, isSelected } = useSelection(initial);

  return (
    <OnboardingStep
      step={3}
      title={t('onboarding.goalsTitle')}
      subtitle={t('onboarding.goalsSubtitle')}
      hasSelection={selected.length > 0}
      onAdvance={() =>
        complete.mutate(
          { goalIds: selected },
          { onSuccess: () => router.replace('/(tabs)') },
        )
      }
      saving={complete.isPending}
      saveError={complete.isError}
      onBack={onBack}
    >
      <ChoiceGroup label={t('onboarding.goalsLabel')}>
        {GOAL_IDS.map((id) => (
          <Chip
            key={id}
            label={t(`goals.${id}`)}
            selected={isSelected(id)}
            onPress={() => toggle(id)}
          />
        ))}
      </ChoiceGroup>
    </OnboardingStep>
  );
}
