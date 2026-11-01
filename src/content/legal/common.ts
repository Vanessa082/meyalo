import type { AppLanguage } from '@/i18n/language';

/**
 * Change this date whenever any legal page's substance changes. Kept as fixed
 * text so the static web export and the app show the same string.
 */
export const LEGAL_LAST_UPDATED: Record<AppLanguage, string> = {
  en: '18 October 2026',
  fr: '18 octobre 2026',
};

export const LEGAL_LABELS: Record<
  AppLanguage,
  { draft: string; lastUpdated: string; colon: string }
> = {
  en: {
    draft:
      'Draft, pending legal review. This text has not yet been reviewed by a lawyer qualified in Cameroon and may change.',
    lastUpdated: 'Last updated',
    colon: ': ',
  },
  fr: {
    draft:
      'Projet, en attente de revue juridique. Ce texte n’a pas encore été relu par un avocat exerçant au Cameroun et peut changer.',
    lastUpdated: 'Dernière mise à jour',
    // French typography: a non-breaking space before the colon.
    colon: '\u00a0: ',
  },
};
