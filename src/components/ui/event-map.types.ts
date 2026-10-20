import type { LatLng } from '@/config/discovery/cities';
import type { EventCardData } from '@/types/event.type';

export interface EventMapProps {
  /** Where to centre: the user's city centre. */
  center: LatLng;
  /** Radius shown, in km; null for the whole city. */
  radiusKm: number | null;
  /** Events with coordinates only. */
  events: EventCardData[];
  onOpenEvent: (id: string) => void;
  /** Map height in points; 360 by default. */
  height?: number;
}
