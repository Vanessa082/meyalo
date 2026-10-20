import { AGE_GROUPS, type Consent } from '../types/consent.type.ts';

/** Mirrors the consent_version length check in 012_consent.sql. */
const VERSION_MAX = 40;

/**
 * Why a consent record cannot be sent, or null when it is complete. The
 * database applies the same rule (reports_consent_complete).
 */
export function consentProblem(
  consent: Consent | undefined,
): 'invalid' | 'guardian' | null {
  if (
    !consent ||
    typeof consent.version !== 'string' ||
    consent.version.length === 0 ||
    consent.version.length > VERSION_MAX ||
    (consent.language !== 'en' && consent.language !== 'fr') ||
    !(AGE_GROUPS as readonly string[]).includes(consent.ageGroup)
  ) {
    return 'invalid';
  }
  if (consent.ageGroup === 'under_18' && consent.guardianConsent !== true) {
    return 'guardian';
  }
  return null;
}

/** The consent columns of a reports or submissions row. */
export function consentColumns(consent: Consent) {
  return {
    consent_version: consent.version,
    consent_language: consent.language,
    age_group: consent.ageGroup,
    // Asked only under 18; an adult was never asked, so nothing is recorded.
    guardian_consent:
      consent.ageGroup === 'under_18' ? consent.guardianConsent : null,
  };
}
