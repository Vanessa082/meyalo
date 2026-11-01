import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CONSENT_VERSION } from '@/config/consent';
import { useTranslation } from '@/i18n/locale-provider';
import { consentProblem } from '@/services/consent';
import { AgeGroupSetting } from '@/services/privacy.service';
import type { AgeGroup, Consent } from '@/types/consent.type';

const AGE_GROUP_KEY = ['age-group'] as const;

/** The age group remembered on this phone, or null when not given yet. */
export function useAgeGroup() {
  return useQuery({
    queryKey: AGE_GROUP_KEY,
    queryFn: () => AgeGroupSetting.get(),
  });
}

export function useSetAgeGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: AgeGroup) => AgeGroupSetting.set(group),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGE_GROUP_KEY }),
  });
}

/**
 * The state of one consent box. `consent` is set only when everything
 * required is ticked; the screen sends nothing until then.
 */
export function useConsentForm() {
  const { language } = useTranslation();
  const { data: stored = null } = useAgeGroup();
  const saveAgeGroup = useSetAgeGroup();
  // Null means "use the remembered answer".
  const [picked, setPicked] = useState<AgeGroup | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [guardian, setGuardian] = useState(false);

  const ageGroup = picked ?? stored?.group ?? null;
  const draft: Consent | null = ageGroup
    ? {
        version: CONSENT_VERSION,
        language,
        ageGroup,
        guardianConsent: ageGroup === 'under_18' && guardian,
      }
    : null;
  const consent =
    agreed && draft && consentProblem(draft) === null ? draft : null;

  return {
    ageGroup,
    /** The phone already knows the age group; the choice can stay folded. */
    remembered: stored !== null && picked === null,
    setAgeGroup: (group: AgeGroup) => {
      setPicked(group);
      if (group === '18_plus') setGuardian(false);
    },
    agreed,
    setAgreed,
    guardian,
    setGuardian,
    consent,
    /** After a send: keep the age group, untick the boxes for next time. */
    finish: () => {
      if (picked && picked !== stored?.group) saveAgeGroup.mutate(picked);
      setPicked(null);
      setAgreed(false);
      setGuardian(false);
    },
  };
}

export type ConsentForm = ReturnType<typeof useConsentForm>;
