import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WelcomeBackdrop } from '@/components/onboarding/welcome-backdrop';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { ForceDark } from '@/components/ui/force-dark';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Text } from '@/components/ui/text';
import { publicEnv } from '@/config/env';
import { useMarkEnteredApp } from '@/hooks/use-discovery-profile';
import { useGutter } from '@/hooks/use-gutter';
import { useTheme } from '@/hooks/use-theme';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import { Layout, Spacing, TextStyles } from '@/theme';

const POINTS: { title: TxKeyPath; body: TxKeyPath }[] = [
  { title: 'welcome.pointProfileTitle', body: 'welcome.pointProfileBody' },
  { title: 'welcome.pointReasonsTitle', body: 'welcome.pointReasonsBody' },
  { title: 'welcome.pointPlanTitle', body: 'welcome.pointPlanBody' },
];

/** Darkens the video so the text over it reads in any frame. */
const VIDEO_SCRIM = 'rgba(17, 19, 18, 0.62)';

/**
 * The welcome video fills the screen; everything sits on it in the dark
 * palette (ForceDark), so text stays light over the footage in either theme.
 */
export default function WelcomeScreen() {
  return (
    <ForceDark style={styles.root}>
      <WelcomeBackdrop />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: VIDEO_SCRIM }]}
        aria-hidden
      />
      <WelcomeContent />
    </ForceDark>
  );
}

function WelcomeContent() {
  const colors = useTheme();
  const router = useRouter();
  const gutter = useGutter();
  const { t } = useTranslation();
  const markEntered = useMarkEnteredApp();

  const exploreFirst = () => {
    markEntered.mutate();
    router.replace('/(tabs)');
  };

  const legalLinks = [
    { url: publicEnv.privacyPolicyUrl, label: t('welcome.privacyPolicy') },
    { url: publicEnv.termsUrl, label: t('welcome.terms') },
  ].filter((link): link is { url: string; label: string } => Boolean(link.url));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View
        style={[styles.column, styles.topBar, { paddingHorizontal: gutter }]}
      >
        <BrandLogo variant="horizontal" size="sm" />
        <LanguageToggle />
      </View>

      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.column,
          styles.scroll,
          { paddingHorizontal: gutter },
        ]}
      >
        <View style={styles.intro}>
          <Text
            variant="display"
            accessibilityRole="header"
            maxFontSizeMultiplier={1.4}
          >
            {t('welcome.headline')}
          </Text>
          <Text variant="body" tone="secondary">
            {t('welcome.body')}
          </Text>
        </View>

        <View style={styles.points}>
          {POINTS.map((point, index) => (
            <View
              key={point.title}
              accessible
              style={[styles.point, { borderTopColor: colors.border }]}
            >
              <Text
                variant="caption"
                tone="primary"
                numeric
                style={styles.pointIndex}
              >
                {String(index + 1).padStart(2, '0')}
              </Text>
              <View style={styles.pointText}>
                <Text variant="headline">{t(point.title)}</Text>
                <Text variant="callout" tone="muted">
                  {t(point.body)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={[styles.column, styles.footer, { paddingHorizontal: gutter }]}
      >
        <Button
          title={t('welcome.getStarted')}
          size="large"
          fullWidth
          onPress={() => router.push('/(onboarding)/location')}
          testID="welcome-get-started"
        />
        <Button
          title={t('welcome.exploreFirst')}
          variant="ghost"
          size="large"
          fullWidth
          accessibilityHint={t('welcome.exploreFirstHint')}
          onPress={exploreFirst}
          testID="welcome-explore-first"
        />
        <Button
          title={t('welcome.signIn')}
          variant="ghost"
          size="small"
          onPress={() =>
            router.push({
              pathname: '/(auth)/sign-in',
              params: { from: 'welcome' },
            })
          }
        />
        <Text variant="footnote" tone="muted" align="center">
          {t('welcome.privacy')}
        </Text>
        {legalLinks.length > 0 ? (
          <View style={styles.legal}>
            {legalLinks.map((link) => (
              <Button
                key={link.label}
                title={link.label}
                variant="ghost"
                size="small"
                textStyle={styles.legalLabel}
                onPress={() => {
                  void WebBrowser.openBrowserAsync(link.url);
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: Layout.readableWidth,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.xxxl,
  },
  intro: {
    gap: Spacing.lg,
  },
  points: {
    gap: 0,
  },
  point: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pointIndex: {
    width: 20,
    paddingTop: 3,
  },
  pointText: {
    flex: 1,
    gap: Spacing.xxs,
  },
  footer: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  legal: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  legalLabel: {
    fontSize: TextStyles.footnote.fontSize,
    lineHeight: TextStyles.footnote.lineHeight,
  },
});
