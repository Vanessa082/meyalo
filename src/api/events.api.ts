import { supabase } from '@/lib/supabase';
import { DEMO_FALLBACK_EVENTS } from '@/services/event.service';
import type { EventCardData } from '@/types/event.type';

/**
 * Reusable API Fetchers for Events
 */
export const eventsApi = {
  /**
   * Fetch all active discovery events (For You feed)
   */
  async getForYouEvents(): Promise<EventCardData[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return DEMO_FALLBACK_EVENTS;
      }

      return data as EventCardData[];
    } catch {
      return DEMO_FALLBACK_EVENTS;
    }
  },

  /**
   * Fetch a single event by ID
   */
  async getEventById(id: string): Promise<EventCardData> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return (
          DEMO_FALLBACK_EVENTS.find((item) => item.id === id) ??
          DEMO_FALLBACK_EVENTS[0]
        );
      }

      return data as EventCardData;
    } catch {
      return (
        DEMO_FALLBACK_EVENTS.find((item) => item.id === id) ??
        DEMO_FALLBACK_EVENTS[0]
      );
    }
  },

  /**
   * Search events by keyword query or category
   */
  async searchEvents(query: string): Promise<EventCardData[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(
          `title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`,
        );

      if (error || !data || data.length === 0) {
        return DEMO_FALLBACK_EVENTS.filter((e) =>
          e.title.toLowerCase().includes(query.toLowerCase()),
        );
      }

      return data as EventCardData[];
    } catch {
      return DEMO_FALLBACK_EVENTS;
    }
  },
};
