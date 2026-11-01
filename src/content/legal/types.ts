import type { AppLanguage } from '@/i18n/language';

/**
 * Legal pages are long-form documents that a lawyer reviews as a whole, so
 * they live here as structured content per language instead of as hundreds
 * of i18n keys.
 */
export type LegalBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export type LocalizedLegalDocument = Record<AppLanguage, LegalDocument>;
