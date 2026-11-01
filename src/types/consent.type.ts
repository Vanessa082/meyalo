/** Mirrors the age_group check in 012_consent.sql. */
export const AGE_GROUPS = ['18_plus', 'under_18'] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

/**
 * What a person agreed to when sending something to our server (docs/
 * product-decisions.md, "Spec: consent, privacy settings and notifications").
 * The database stamps the time.
 */
export interface Consent {
  /** The notice version shown (config/consent.ts). */
  version: string;
  /** The language the notice was shown in. */
  language: 'en' | 'fr';
  ageGroup: AgeGroup;
  /** A parent or guardian agrees. Required for under 18. */
  guardianConsent: boolean;
}
