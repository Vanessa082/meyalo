import { EventService } from '@/services/event.service';
import type { EventCardData } from '@/types/event.type';

/**
 * Reusable API Fetchers for Events connecting directly to Supabase via EventService
 */
export const eventsApi = {
  /**
   * Fetch all active discovery events (For You feed)
   */
  async getForYouEvents(): Promise<EventCardData[]> {
    return EventService.fetchForYouEvents();
  },

  /**
   * Fetch a single event by ID
   */
  async getEventById(id: string): Promise<EventCardData | null> {
    return EventService.fetchEventById(id);
  },

  /**
   * Search events by keyword query or category
   */
  async searchEvents(query: string): Promise<EventCardData[]> {
    return EventService.searchEvents(query);
  },
};
