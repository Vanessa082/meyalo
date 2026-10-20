import { supabase } from '@/lib/supabase';
import { createEventCuration } from '@/services/event-curation';
import { toEventCard } from '@/services/event-mapping';
import {
  createEventRepository,
  isEventRepositoryError,
} from '@/services/event-repository';
import type {
  EventCardData,
  EventCursor,
  EventSearchInput,
  EventSort,
} from '@/types/event.type';
import type { EventTranslation } from './event-repository';

/** The app's single event repository, on the app's Supabase session. */
export const eventRepository = createEventRepository(supabase);

export const eventCuration = createEventCuration(eventRepository);

const CONSUMER_PAGE_SIZE = 50;
const EXPLORE_PAGE_SIZE = 20;

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
    return page.items.map(toEventCard);
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

  translateEvent(id: string, target: 'en' | 'fr'): Promise<EventTranslation> {
    return eventRepository.translate(id, target);
  },

  /** One page of Explore results; the first page carries the total. */
  async searchEvents(
    input: EventSearchInput,
    sort: EventSort,
    cursor: EventCursor | null,
  ): Promise<{
    items: EventCardData[];
    nextCursor: EventCursor | null;
    total?: number;
  }> {
    const page = await eventRepository.searchPublished(input, {
      sort,
      cursor,
      limit: EXPLORE_PAGE_SIZE,
    });
    return { ...page, items: page.items.map(toEventCard) };
  },
};
