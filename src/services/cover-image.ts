/**
 * Event images (docs/product-decisions.md, "Spec: event images"). Pure rules
 * shared by the console form and the curation service; the database enforces
 * the same limits (011_event_images.sql).
 */

export const COVER_IMAGE_RIGHTS = [
  'organizer_provided',
  'source_permits',
  'own_photo',
] as const;

export type CoverImageRights = (typeof COVER_IMAGE_RIGHTS)[number];

export const COVER_IMAGE_RIGHTS_LABELS: Record<CoverImageRights, string> = {
  organizer_provided: 'The organiser gave us this image',
  source_permits: 'The official source allows reuse',
  own_photo: 'Our own photo',
};

/** Widths stored: cards and the event page. */
export const COVER_IMAGE_WIDTHS = { small: 640, large: 1600 } as const;

export interface CoverImageInput {
  rights: CoverImageRights | null;
  alt: string;
  credit: string | null;
}

/** Why the input cannot be saved, or null when it can. */
export function coverImageInputProblem(input: CoverImageInput): string | null {
  if (!input.rights) {
    return 'Say how we have the right to use this image.';
  }
  const alt = input.alt.trim();
  if (alt.length < 3) {
    return 'Describe what the image shows, for people using screen readers.';
  }
  if (alt.length > 200) return 'Keep the description under 200 characters.';
  if ((input.credit?.trim().length ?? 0) > 120) {
    return 'Keep the credit under 120 characters.';
  }
  return null;
}

/** Storage names for one upload. A fresh `id` per upload means a replaced
 *  image never serves a stale cached file. */
export function coverImageFiles(eventId: string, id: string) {
  const path = `${eventId}/${id}`;
  return {
    path,
    small: `${path}-${COVER_IMAGE_WIDTHS.small}.webp`,
    large: `${path}-${COVER_IMAGE_WIDTHS.large}.webp`,
  };
}
