import { supabase } from '@/lib/supabase';
import type { EventCardData } from '@/types/event.type';

export const DEMO_FALLBACK_EVENTS: EventCardData[] = [
  {
    id: '1',
    slug: 'women-in-business-workshop',
    title: 'Women in Business Workshop',
    organizerName: 'Impact Hub Yaoundé',
    eventType: 'Workshop',
    primaryCategory: 'Build • Connect • Grow',
    subtitleCategories: 'Build • Connect • Grow',
    startsAt: '2026-08-31T10:00:00Z',
    dateFormatted: 'Sat, 31 Aug • 10:00 AM',
    dateBadgeText: 'TOMORROW',
    timezone: 'WAT',
    format: 'in_person',
    venueName: 'Impact Hub Yaoundé',
    city: 'Yaoundé',
    priceType: 'free',
    priceLabel: 'Free',
    status: 'scheduled',
    trustLabel: 'Verified from organizer',
    verificationText: 'Verified from organizer • Checked today',
    distanceKm: 2.4,
    distanceText: '2.4 km',
    coverImageUrl:
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: '2',
    slug: 'career-employability-forum',
    title: 'Career & Employability Forum',
    organizerName: 'Meyalo Career Hub',
    eventType: 'Conference',
    primaryCategory: 'Jobs • Skills • Opportunities',
    subtitleCategories: 'Jobs • Skills • Opportunities',
    startsAt: '2026-09-02T09:00:00Z',
    dateFormatted: 'Mon, 02 Sep • 9:00 AM',
    dateBadgeText: 'SEP 02',
    timezone: 'WAT',
    format: 'in_person',
    venueName: 'Hilton Hotel Yaoundé',
    city: 'Yaoundé',
    priceType: 'free',
    priceLabel: 'Free',
    status: 'scheduled',
    trustLabel: 'Verified from organizer',
    verificationText: 'Verified from organizer • Checked 2h ago',
    distanceKm: 3.1,
    distanceText: '3.1 km',
    coverImageUrl:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: '3',
    slug: 'silicon-mountain-hackathon',
    title: 'Silicon Mountain Developer Hackathon 2026',
    organizerName: 'Buea Tech Collective',
    eventType: 'Hackathon',
    primaryCategory: 'Software Engineering • AI',
    subtitleCategories: 'Code • Product • Innovation',
    startsAt: '2026-10-03T08:00:00Z',
    dateFormatted: 'Sat, 03 Oct • 8:00 AM',
    dateBadgeText: 'OCT 03',
    timezone: 'WAT',
    format: 'in_person',
    venueName: 'Silicon Mountain Hub',
    city: 'Buea',
    priceType: 'free',
    priceLabel: 'Free',
    status: 'scheduled',
    trustLabel: 'Verified from organizer',
    verificationText: 'Verified from organizer • Checked 1d ago',
    distanceKm: 5.0,
    distanceText: '5.0 km',
    coverImageUrl:
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80',
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
