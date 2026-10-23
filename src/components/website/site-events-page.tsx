import { Link } from 'expo-router';
import Head from 'expo-router/head';
import { StyleSheet, View } from 'react-native';
import { Page } from '@/components/ui/page';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { OTHER_CITIES, QUICK_PICK_CITIES } from '@/config/discovery/cities';
import { publicUrl } from '@/config/env';
import { SITE_LISTING } from '@/config/site-data';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { Spacing } from '@/theme';
import { SiteEventList } from './site-event-list';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

const CITIES = [...QUICK_PICK_CITIES, ...OTHER_CITIES];

/** City ids that have upcoming events in the last build. */
export function citiesWithEvents(): string[] {
  return [
    ...new Set(
      SITE_LISTING.map((item) => item.cityId).filter(
        (id): id is string => id !== null,
      ),
    ),
  ];
}

/**
 * The website's event lists (docs/product-decisions.md, Feature 20): all
 * upcoming checked events, or one city's. Built at deploy time, so search
 * engines can read them; started events are hidden at render.
 */
export function SiteEventsPage({ cityId }: { cityId?: string }) {
  const colors = useTheme();
  const { t } = useTranslation();
  const city = cityId ? CITIES.find((known) => known.id === cityId) : undefined;
  const items = city
    ? SITE_LISTING.filter((item) => item.cityId === city.id)
    : SITE_LISTING;
  const title = city
    ? t('site.eventsCityTitle', { city: city.name })
    : t('site.eventsTitle');
  const canonical = publicUrl(city ? `/events/${city.id}` : '/events');
  const cities = citiesWithEvents()
    .map((id) => CITIES.find((known) => known.id === id))
    .filter((known): known is (typeof CITIES)[number] => Boolean(known));

  return (
    <Page width="readable" edges={['top', 'bottom']}>
      <Head>
        <title>{`${title} · Meyalo`}</title>
        <meta name="description" content={t('site.eventsLead')} />
        {canonical ? <link rel="canonical" href={canonical} /> : null}
      </Head>
      <SiteHeader />
      <Stack gap="sm">
        <Text variant="title1" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="callout" tone="secondary">
          {t('site.eventsLead')}
        </Text>
      </Stack>
      {cities.length > 0 ? (
        <View style={styles.cities}>
          <Text variant="footnote" tone="muted">
            {t('site.cities')}
          </Text>
          <Link href="/events">
            <Text
              variant="footnote"
              weight={city ? 'regular' : 'bold'}
              style={{ color: colors.textLink }}
            >
              {t('site.footerEvents')}
            </Text>
          </Link>
          {cities.map((known) => (
            <Link key={known.id} href={`/events/${known.id}`}>
              <Text
                variant="footnote"
                weight={known.id === city?.id ? 'bold' : 'regular'}
                style={{ color: colors.textLink }}
              >
                {known.name}
              </Text>
            </Link>
          ))}
        </View>
      ) : null}
      <SiteEventList items={items} />
      <SiteFooter />
    </Page>
  );
}

const styles = StyleSheet.create({
  cities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.md,
    rowGap: Spacing.xs,
  },
});
