import { useLocalSearchParams } from 'expo-router';
import {
  citiesWithEvents,
  SiteEventsPage,
} from '@/components/website/site-events-page';

/** Static export: one page per city with upcoming events at build time. */
export async function generateStaticParams(): Promise<
  Record<string, string>[]
> {
  return citiesWithEvents().map((city) => ({ city }));
}

export default function CityEventsScreen() {
  const { city } = useLocalSearchParams<{ city: string }>();
  return <SiteEventsPage cityId={city} />;
}
