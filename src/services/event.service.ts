import { supabase } from '@/lib/supabase';
import type { EventCardData } from '@/types/event.type';

const DEMO_FALLBACK_EVENTS: EventCardData[] = [
  {
    id: '1',
    slug: 'yaounde-tech-summit-2026',
    title: 'Yaoundé Tech & Entrepreneurship Summit 2026',
    organizerName: 'Cameroon Innovation Network',
    eventType: 'conference',
    primaryCategory: 'Technology & Business',
    startsAt: 'Sat, Sep 12 • 09:00 AM',
    timezone: 'WAT',
    format: 'in_person',
    city: 'Yaoundé',
    priceType: 'free',
    priceLabel: 'Free',
    status: 'scheduled',
    trustLabel: 'Verified Organizer',
  },
];

export const EventService = {
  async fetchForYouEvents(): Promise<EventCardData[]> {
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
};
