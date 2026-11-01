import previews from '@/generated/event-previews.json';
import type { ListingItem } from '@/services/event-listing';

/**
 * What the last web build knew (scripts/build-event-previews.mjs): the
 * website's event list and when it was made. Empty in development until the
 * script runs; pages filter out events that have started at render time.
 */
const data = previews as {
  generatedAt: string | null;
  listing?: ListingItem[];
};

export const SITE_LISTING: readonly ListingItem[] = data.listing ?? [];
export const SITE_UPDATED_AT: string | null = data.generatedAt;
