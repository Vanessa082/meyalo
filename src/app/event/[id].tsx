import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { DEMO_FALLBACK_EVENTS } from '@/services/event.service';

export default function EventDetailScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Find target event or fallback to first demo event
  const event =
    DEMO_FALLBACK_EVENTS.find((item) => item.id === id) ??
    DEMO_FALLBACK_EVENTS[0];

  const handleOpenSource = () => {
    const url = event.sourceUrl ?? 'https://meyalo.app';
    Linking.openURL(url);
  };

  return (
    <Screen style={styles.container} scrollable>
      {/* ─── Hero Image & Floating Back Button ─── */}
      <View style={styles.heroWrapper}>
        <Image
          source={{ uri: event.coverImageUrl }}
          style={styles.heroImage}
          contentFit="cover"
        />
        <Pressable
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* ─── Main Content ─── */}
      <View style={styles.content}>
        {/* Category & Format Badges */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <ThemeText variant="captionBold" style={{ color: colors.primary }}>
              {event.eventType.toUpperCase()}
            </ThemeText>
          </View>
          <View
            style={[styles.formatBadge, { backgroundColor: colors.surface }]}
          >
            <ThemeText variant="caption" themeColor="textMuted">
              {event.format === 'in_person' ? '📍 In Person' : '🌐 Virtual'}
            </ThemeText>
          </View>
        </View>

        {/* Title */}
        <ThemeText variant="h1" style={styles.title}>
          {event.title}
        </ThemeText>

        {/* ─── Provenance & Trust Card ─── */}
        <Card
          variant="flat"
          padding="md"
          style={[
            styles.trustCard,
            { backgroundColor: colors.primarySoft, borderColor: colors.border },
          ]}
        >
          <View style={styles.trustHeader}>
            <ShieldCheck size={20} color={colors.primary} />
            <ThemeText variant="title" style={styles.trustTitle}>
              {t('eventDetail.verifiedProvenance')}
            </ThemeText>
          </View>

          <View style={styles.trustRow}>
            <CheckCircle2 size={16} color={colors.primary} />
            <ThemeText variant="caption" themeColor="text">
              {t('eventDetail.organizedBy')}{' '}
              <ThemeText variant="captionBold">{event.organizerName}</ThemeText>
            </ThemeText>
          </View>

          <View style={styles.trustRow}>
            <Globe size={16} color={colors.textMuted} />
            <ThemeText variant="caption" themeColor="textMuted">
              {t('eventDetail.source')}: {event.verificationText}
            </ThemeText>
          </View>
        </Card>

        {/* ─── Key Metadata ─── */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.metaIconCircle,
                { backgroundColor: colors.surface },
              ]}
            >
              <Calendar size={18} color={colors.primary} />
            </View>
            <View>
              <ThemeText variant="subtitle">{event.dateFormatted}</ThemeText>
              <ThemeText variant="caption" themeColor="textMuted">
                {t('eventDetail.timezone')}: {event.timezone}
              </ThemeText>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.metaIconCircle,
                { backgroundColor: colors.surface },
              ]}
            >
              <MapPin size={18} color={colors.primary} />
            </View>
            <View style={styles.locationText}>
              <ThemeText variant="subtitle">
                {event.venueName ?? 'Online Event'}
              </ThemeText>
              <ThemeText variant="caption" themeColor="textMuted">
                {event.city} • {event.distanceText} away
              </ThemeText>
            </View>
          </View>
        </View>

        {/* ─── Description ─── */}
        <View style={styles.descriptionSection}>
          <ThemeText variant="title" style={styles.sectionHeader}>
            {t('eventDetail.aboutOpportunity')}
          </ThemeText>
          <ThemeText variant="body" themeColor="text" style={styles.bodyText}>
            {event.description ?? t('eventDetail.defaultAbout')}
          </ThemeText>
        </View>

        {/* ─── Bottom CTA Bar ─── */}
        <View style={styles.footerCTA}>
          <Button
            title={t('eventDetail.registerButton')}
            variant="primary"
            size="large"
            icon={<ExternalLink size={18} color={colors.textInverse} />}
            onPress={handleOpenSource}
          />
          <ThemeText
            variant="caption"
            themeColor="textMuted"
            style={styles.disclaimerText}
          >
            {t('eventDetail.disclaimer')}
          </ThemeText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroWrapper: {
    height: 240,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  formatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 16,
  },
  trustCard: {
    marginBottom: 24,
    gap: 8,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  trustTitle: {
    fontSize: 14,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaSection: {
    gap: 16,
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
  },
  descriptionSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 18,
    marginBottom: 8,
  },
  bodyText: {
    lineHeight: 22,
  },
  footerCTA: {
    gap: 8,
  },
  disclaimerText: {
    textAlign: 'center',
    fontSize: 11,
  },
});
