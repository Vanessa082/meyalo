/**
 * PersonalizeBanner
 *
 * Dismissable banner that prompts the user to personalise their feed.
 * Uses the Wand2 icon to match the mockup design.
 */
import { Wand2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemeText } from './theme-text';

interface PersonalizeBannerProps {
  onPersonalize?: () => void;
}

export function PersonalizeBanner({ onPersonalize }: PersonalizeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <View style={styles.bannerContainer}>
      {/* Dismiss */}
      <Pressable
        style={styles.dismissButton}
        onPress={() => setIsVisible(false)}
        hitSlop={12}
      >
        <X size={16} color="#475569" strokeWidth={2} />
      </Pressable>

      <View style={styles.contentRow}>
        {/* Wand icon circle — matches the mockup */}
        <View style={styles.iconCircle}>
          <Wand2 size={22} color="#087F73" strokeWidth={1.8} />
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <ThemeText variant="subhead" style={styles.title}>
            Make this more personal
          </ThemeText>
          <ThemeText variant="caption" style={styles.subtitle}>
            Tell us what you&apos;re interested in to get better
            recommendations.
          </ThemeText>
        </View>

        {/* CTA */}
        <View style={styles.ctaWrapper}>
          <Pressable style={styles.personalizeButton} onPress={onPersonalize}>
            <ThemeText variant="captionBold" style={styles.buttonText}>
              Personalize
            </ThemeText>
          </Pressable>
          <ThemeText variant="caption" style={styles.timeText}>
            Takes 1 min
          </ThemeText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    backgroundColor: '#E6F4F1',
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 20, // space for the X button
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  ctaWrapper: {
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  personalizeButton: {
    backgroundColor: '#087F73',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  timeText: {
    fontSize: 10,
    color: '#64748B',
  },
});
