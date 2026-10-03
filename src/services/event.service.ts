import { supabase } from '@/lib/supabase';
import { createEventCuration } from '@/services/event-curation';
import { toEventCard } from '@/services/event-mapping';
import {
  createEventRepository,
  isEventRepositoryError,
} from '@/services/event-repository';
import type { EventCardData } from '@/types/event.type';

/** The app's single event repository, on the app's Supabase session. */
export const eventRepository = createEventRepository(supabase);

export const eventCuration = createEventCuration(eventRepository);

const CONSUMER_PAGE_SIZE = 50;

/**
 * Consumer reads. Always published and confirmed events, even when a curator
 * is signed in on the same device. Failures are thrown, not hidden as empty.
 */
export const EventService = {
  async fetchForYouEvents(): Promise<EventCardData[]> {
    const page = await eventRepository.listPublished({
      filters: { startsFrom: new Date().toISOString() },
      sort: 'start_asc',
      limit: CONSUMER_PAGE_SIZE,
    });
    return page.items.map((event) => toEventCard(event));
  },

  async fetchEventById(id: string): Promise<EventCardData | null> {
    if (!id) return null;
    try {
      return toEventCard(await eventRepository.getPublishedById(id));
    } catch (error) {
      if (
        isEventRepositoryError(error) &&
        (error.kind === 'not_found' || error.kind === 'invalid_input')
      ) {
        return null;
      }
      throw error;
    }
  },
};
