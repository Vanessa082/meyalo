import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Flag,
  Globe,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { useEventDetail } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { publicLinkLabel } from '@/services/event-mapping';

export default function EventDetailScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: event, isLoading, isError } = useEventDetail(id ?? '');

  const link = event ? publicLinkLabel(event) : { title: 'No link stated' };
  const provenanceConfirmed =
    event?.verificationState === 'source_confirmed' ||
    event?.verificationState === 'organizer_confirmed';

  const handleOpenSource = () => {
    if (link.url) {
      Linking.openURL(link.url);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report Event',
      'Thank you for helping keep Meyalo accurate. If this event contains outdated or incorrect information, our team will review it shortly.',
      [{ text: 'OK' }],
    );
  };

  if (isLoading) {
    return (
      <Screen style={styles.loadingContainer}>
        <ThemeText variant="body" themeColor="textMuted">
          Loading event details...
        </ThemeText>
      </Screen>
    );
  }

  if (isError || !event) {
    return (
      <Screen style={styles.loadingContainer}>
        <ThemeText variant="h1" style={styles.errorTitle}>
          Event Not Found
        </ThemeText>
        <ThemeText
          variant="body"
          themeColor="textMuted"
          style={styles.errorText}
        >
          The requested growth opportunity could not be found or has been
          removed.
        </ThemeText>
        <Button
          title="Back to Discovery"
          variant="primary"
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.container} scrollable>
      {/* ─── Hero Image & Floating Back Button ─── */}
      <View style={styles.heroWrapper}>
        {event.coverImageUrl ? (
          <Image
            source={{ uri: event.coverImageUrl }}
            style={styles.heroImage}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.heroImage,
              styles.heroPlaceholder,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <ThemeText variant="title" themeColor="textMuted">
              {event.eventType}
            </ThemeText>
            {event.dateBadgeText ? (
              <ThemeText variant="caption" themeColor="textMuted">
                {event.dateBadgeText}
              </ThemeText>
            ) : null}
          </View>
        )}
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
              {event.format === 'in_person'
                ? '📍 In Person'
                : event.format === 'hybrid'
                  ? '🔄 Hybrid'
                  : '🌐 Virtual'}
            </ThemeText>
          </View>
        </View>

        {/* Title */}
        <ThemeText variant="h1" style={styles.title}>
          {event.title}
        </ThemeText>

        {/* ─── Provenance & Trust Card (Evidence-Based) ─── */}
        <Card
          variant="flat"
          padding="md"
          style={[
            styles.trustCard,
            { backgroundColor: colors.primarySoft, borderColor: colors.border },
          ]}
        >
          <View style={styles.trustHeader}>
            {provenanceConfirmed ? (
              <ShieldCheck size={20} color={colors.primary} />
            ) : null}
            <ThemeText variant="title" style={styles.trustTitle}>
              {event.trustLabel ?? 'Not reviewed'}
            </ThemeText>
          </View>

          <View style={styles.trustRow}>
            <ThemeText variant="caption" themeColor="text">
              Organized by{' '}
              <ThemeText variant="captionBold">{event.organizerName}</ThemeText>
            </ThemeText>
          </View>

          {event.verificationText ? (
            <View style={styles.trustRow}>
              {provenanceConfirmed ? (
                <CheckCircle2 size={16} color={colors.primary} />
              ) : (
                <Globe size={16} color={colors.textMuted} />
              )}
              <ThemeText variant="caption" themeColor="textMuted">
                {event.verificationText}
              </ThemeText>
            </View>
          ) : null}
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
                {event.timezone
                  ? `Timezone: ${event.timezone}`
                  : 'Timezone not stated'}
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
                {event.format === 'virtual'
                  ? 'Online'
                  : (event.venueName ?? event.city ?? 'Venue to be confirmed')}
              </ThemeText>
              <ThemeText variant="caption" themeColor="textMuted">
                {event.format === 'virtual'
                  ? 'Online'
                  : (event.city ?? 'Venue to be confirmed')}
              </ThemeText>
            </View>
          </View>
        </View>

        {/* ─── Description ─── */}
        <View style={styles.descriptionSection}>
          <ThemeText variant="title" style={styles.sectionHeader}>
            About This Opportunity
          </ThemeText>
          <ThemeText variant="body" themeColor="text" style={styles.bodyText}>
            {event.description?.trim()
              ? event.description
              : 'Description not stated'}
          </ThemeText>
        </View>

        {/* ─── Safety & Report Action ─── */}
        <Pressable onPress={handleReport} style={styles.reportRow}>
          <Flag size={14} color={colors.textMuted} />
          <ThemeText variant="caption" themeColor="textMuted">
            Report incorrect or outdated information
          </ThemeText>
        </Pressable>

        {/* ─── Bottom CTA Bar ─── */}
        <View style={styles.footerCTA}>
          <Button
            title={link.title}
            variant="primary"
            size="large"
            icon={<ExternalLink size={18} color={colors.textInverse} />}
            onPress={handleOpenSource}
            disabled={!link.url}
          />
          {link.url ? (
            <ThemeText
              variant="caption"
              themeColor="textMuted"
              style={styles.disclaimerText}
            >
              {event.registrationUrl
                ? 'Opens the registration page.'
                : 'Opens the event source.'}
            </ThemeText>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 22,
    marginBottom: 8,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 20,
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
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
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
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    marginBottom: 8,
  },
  bodyText: {
    lineHeight: 22,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  footerCTA: {
    gap: 8,
  },
  disclaimerText: {
    textAlign: 'center',
    fontSize: 11,
  },
});
