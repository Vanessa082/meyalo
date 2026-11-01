import { type Href, Link, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { BadgeCheck, CalendarDays, MessageCircle } from 'lucide-react-native';
import { Linking, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/ui/icon-circle';
import { Page } from '@/components/ui/page';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { publicEnv, publicUrl } from '@/config/env';
import { SITE_LISTING, SITE_UPDATED_AT } from '@/config/site-data';
import { useHasEnteredApp } from '@/hooks/use-discovery-profile';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeAgo } from '@/i18n/format';
import { useTranslation } from '@/i18n/locale-provider';
import { whatsAppContactUrl } from '@/services/share';
import { Spacing } from '@/theme';
import { SiteEventList } from './site-event-list';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/**
 * The website home page (docs/product-decisions.md, Feature 20): what Meyalo
 * is, this week's checked events from the last build, how to get the app,
 * and how organisers reach us. Static, no tracking, no cookies.
 */
export function WebHome() {
  const colors = useTheme();
  const router = useRouter();
  const { t, language } = useTranslation();
  const { data: hasEntered } = useHasEnteredApp();
  const contact = whatsAppContactUrl(
    publicEnv.contactWhatsApp,
    t('site.forwardMessage'),
  );
  const stores = [
    publicEnv.playStoreUrl
      ? { label: t('site.googlePlay'), url: publicEnv.playStoreUrl }
      : null,
    publicEnv.appStoreUrl
      ? { label: t('site.appStore'), url: publicEnv.appStoreUrl }
      : null,
  ].filter((store): store is { label: string; url: string } => store !== null);
  const canonical = publicUrl('/');

  return (
    <Page width="readable" edges={['top', 'bottom']}>
      <Head>
        <title>{`Meyalo · ${t('site.headline')}`}</title>
        <meta name="description" content={t('site.description')} />
        <meta property="og:title" content={`Meyalo · ${t('site.headline')}`} />
        <meta property="og:description" content={t('site.description')} />
        {canonical ? <link rel="canonical" href={canonical} /> : null}
        {canonical ? (
          <meta property="og:image" content={`${canonical}og-default.png`} />
        ) : null}
      </Head>

      <SiteHeader />

      <Stack gap="md" style={styles.hero}>
        <Text variant="display" accessibilityRole="header">
          {t('site.headline')}
        </Text>
        <Text variant="body" tone="secondary">
          {t('site.lead')}
        </Text>
        <Button
          title={t('site.openApp')}
          size="large"
          onPress={() =>
            router.push(hasEntered ? '/(tabs)' : '/(onboarding)/welcome')
          }
        />
      </Stack>

      <Stack gap="md">
        <Point
          icon={BadgeCheck}
          title={t('site.checkedTitle')}
          body={t('site.checkedBody')}
          link={{ label: t('site.checkedLink'), href: '/how-we-verify' }}
        />
        <Point
          icon={CalendarDays}
          title={t('site.planTitle')}
          body={t('site.planBody')}
        />
      </Stack>

      <Stack gap="md">
        <Text variant="title2" accessibilityRole="header">
          {t('site.thisWeek')}
        </Text>
        {SITE_UPDATED_AT ? (
          <Text variant="footnote" tone="muted">
            {t('site.updated', {
              time: formatTimeAgo(
                new Date(SITE_UPDATED_AT),
                new Date(),
                language,
              ),
            })}
          </Text>
        ) : null}
        <SiteEventList items={SITE_LISTING} limit={6} />
        <Link href="/events">
          <Text variant="callout" style={{ color: colors.textLink }}>
            {t('site.allEvents')}
          </Text>
        </Link>
      </Stack>

      <Card variant="outlined" padding="lg" style={styles.card}>
        <Stack gap="md">
          <Text variant="title2" accessibilityRole="header">
            {t('site.getAppTitle')}
          </Text>
          {stores.length > 0 ? (
            <Stack direction="row" gap="sm" wrap>
              {stores.map((store) => (
                <Button
                  key={store.label}
                  title={store.label}
                  variant="secondary"
                  onPress={() => void Linking.openURL(store.url)}
                />
              ))}
            </Stack>
          ) : (
            <Text variant="callout" tone="muted">
              {t('site.storesSoon')}
            </Text>
          )}
          <Text variant="footnote" tone="muted">
            {t('site.webToo')}
          </Text>
        </Stack>
      </Card>

      <Card variant="outlined" padding="lg" style={styles.card}>
        <Stack gap="md">
          <Text variant="title2" accessibilityRole="header">
            {t('site.organizersTitle')}
          </Text>
          <Text variant="body" tone="secondary">
            {t('site.organizersBody')}
          </Text>
          <Stack direction="row" gap="sm" wrap>
            <Button
              title={t('site.suggest')}
              variant="secondary"
              onPress={() => router.push('/submit')}
            />
            {contact ? (
              <Button
                title={t('site.forwardWhatsApp')}
                variant="ghost"
                icon={<MessageCircle size={18} color={colors.primary} />}
                onPress={() => void Linking.openURL(contact)}
              />
            ) : null}
          </Stack>
        </Stack>
      </Card>

      <SiteFooter />
    </Page>
  );
}

function Point({
  icon,
  title,
  body,
  link,
}: {
  icon: typeof BadgeCheck;
  title: string;
  body: string;
  link?: { label: string; href: Href };
}) {
  const colors = useTheme();
  return (
    <Stack direction="row" gap="md" align="flex-start">
      <IconCircle icon={icon} />
      <Stack gap="xxs" style={styles.fill}>
        <Text variant="headline">{title}</Text>
        <Text variant="callout" tone="secondary">
          {body}
        </Text>
        {link ? (
          <Link href={link.href}>
            <Text variant="callout" style={{ color: colors.textLink }}>
              {link.label}
            </Text>
          </Link>
        ) : null}
      </Stack>
    </Stack>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingVertical: Spacing.lg,
  },
  card: {
    borderWidth: 1,
  },
  fill: {
    flex: 1,
  },
});
