import { type Href, Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { publicEnv } from '@/config/env';
import { useTheme } from '@/hooks/use-theme';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import { whatsAppContactUrl } from '@/services/share';
import { Spacing } from '@/theme';

const PAGES: [TxKeyPath, Href][] = [
  ['site.footerEvents', '/events'],
  ['site.footerHowWeVerify', '/how-we-verify'],
  ['site.footerSuggest', '/submit'],
  ['site.footerPrivacy', '/privacy'],
  ['site.footerTerms', '/terms'],
  ['site.footerDeleteAccount', '/delete-account'],
];

/**
 * The website footer: public pages, and WhatsApp contact and Channel when
 * configured (docs/product-decisions.md, Feature 20).
 */
export function SiteFooter() {
  const colors = useTheme();
  const { t } = useTranslation();
  const contact = whatsAppContactUrl(
    publicEnv.contactWhatsApp,
    t('site.contactMessage'),
  );

  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>
      <View style={styles.links}>
        {PAGES.map(([label, href]) => (
          <Link key={label} href={href} style={{ color: colors.textLink }}>
            <Text variant="footnote" style={{ color: colors.textLink }}>
              {t(label)}
            </Text>
          </Link>
        ))}
        {contact ? (
          <Link href={contact as Href} target="_blank" rel="noopener">
            <Text variant="footnote" style={{ color: colors.textLink }}>
              {t('site.footerWhatsApp')}
            </Text>
          </Link>
        ) : null}
        {publicEnv.whatsappChannelUrl ? (
          <Link
            href={publicEnv.whatsappChannelUrl as Href}
            target="_blank"
            rel="noopener"
          >
            <Text variant="footnote" style={{ color: colors.textLink }}>
              {t('site.footerChannel')}
            </Text>
          </Link>
        ) : null}
      </View>
      <Text variant="caption" tone="muted">
        {t('site.footerNote')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.lg,
    rowGap: Spacing.sm,
  },
});
