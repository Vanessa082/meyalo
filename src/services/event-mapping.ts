/**
 * Pure event-field mapping. No database or environment access, so it can be
 * tested without the Supabase client.
 */

export function mapFormat(format: string): 'in_person' | 'virtual' | 'hybrid' {
  if (format === 'physical' || format === 'in_person') return 'in_person';
  if (format === 'hybrid') return 'hybrid';
  return 'virtual';
}

/**
 * Evidence-based label. A missing source is never described as verified.
 */
/**
 * Bridges the removed is_verified flag and verification_state.
 * Unreviewed is never treated as confirmed. Unknown old rows fall back to the
 * boolean only when the new column is absent.
 */
export function sourceWasConfirmed(row: {
  verification_state?: unknown;
  is_verified?: unknown;
}): boolean {
  if (
    row.verification_state === 'source_confirmed' ||
    row.verification_state === 'organizer_confirmed'
  ) {
    return true;
  }
  if (row.verification_state === 'unreviewed') return false;
  return row.is_verified === true;
}

export function buildTrustLabel(
  isVerified: boolean,
  sourceUrl: string | null,
): string {
  if (!sourceUrl) return 'Community-submitted';
  if (isVerified) return 'Official source';
  return 'Source available';
}
