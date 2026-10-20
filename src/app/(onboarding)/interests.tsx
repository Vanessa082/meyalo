import { useRouter } from 'expo-router';
import {
  ChoiceGroup,
  OnboardingStep,
} from '@/components/onboarding/onboarding-step';
import { useOnboardingBack } from '@/components/onboarding/use-onboarding-step';
import { useSelection } from '@/components/onboarding/use-selection';
import { Chip } from '@/components/ui/chip';
import { TOPIC_IDS, type TopicId } from '@/config/discovery/topics';
import {
  useDiscoveryProfile,
  useUpdateDiscoveryProfile,
} from '@/hooks/use-discovery-profile';
import { useTranslation } from '@/i18n/locale-provider';

export default function InterestsScreen() {
  const { data: profile, isPending } = useDiscoveryProfile();
  if (isPending) return null;
  return <InterestsStep initial={profile?.interestIds ?? []} />;
}

function InterestsStep({ initial }: { initial: TopicId[] }) {
  const router = useRouter();
  const { t } = useTranslation();
  const onBack = useOnboardingBack('/(onboarding)/location');
  const update = useUpdateDiscoveryProfile();
  const { selected, toggle, isSelected } = useSelection(initial);

  return (
    <OnboardingStep
      step={2}
      title={t('onboarding.interestsTitle')}
      subtitle={t('onboarding.interestsSubtitle')}
      hasSelection={selected.length > 0}
      onAdvance={() =>
        update.mutate(
          { interestIds: selected },
          { onSuccess: () => router.push('/(onboarding)/goals') },
        )
      }
      saving={update.isPending}
      saveError={update.isError}
      onBack={onBack}
    >
      <ChoiceGroup label={t('onboarding.interestsLabel')}>
        {TOPIC_IDS.map((id) => (
          <Chip
            key={id}
            label={t(`topics.${id}`)}
            selected={isSelected(id)}
            onPress={() => toggle(id)}
          />
        ))}
      </ChoiceGroup>
    </OnboardingStep>
  );
}
