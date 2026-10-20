import { useMutation } from '@tanstack/react-query';
import { geocoder } from '@/services/geocoder.service';

/** Venue search for curators; one request per call (provider policy). */
export function useVenueSearch() {
  return useMutation({
    mutationFn: (query: string) => geocoder.search(query, 'fr,en'),
  });
}

export { geocoderAttribution } from '@/services/geocoder.service';
