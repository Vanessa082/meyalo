/**
 * PersonalizeBanner
 *
 * Dismissable banner that prompts the user to personalise their feed.
 * Uses the Wand2 icon to match the mockup design.
 */
import { Wand2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './button';
import { Card } from './card';
import { ThemeText } from './theme-text';

interface PersonalizeBannerProps {
  onPersonalize?: () => void;
}

export function PersonalizeBanner({ onPersonalize }: PersonalizeBannerProps) {
  const colors = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Card
      variant="flat"
      padding="md"
      style={[styles.bannerContainer, { backgroundColor: colors.primarySoft }]}
    >
      {/* Dismiss */}
      <Pressable
        style={styles.dismissButton}
        onPress={() => setIsVisible(false)}
        hitSlop={12}
      >
        <X size={16} color={colors.textMuted} strokeWidth={2} />
      </Pressable>

      <View style={styles.contentRow}>
        {/* Wand icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
          <Wand2 size={22} color={colors.primary} strokeWidth={1.8} />
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <ThemeText variant="title" style={styles.title}>
            Make this more personal
          </ThemeText>
          <ThemeText variant="caption" themeColor="textMuted">
            Tell us what you&apos;re interested in to get better
            recommendations.
          </ThemeText>
        </View>

        {/* CTA */}
        <View style={styles.ctaWrapper}>
          <Button
            size="small"
            variant="primary"
            title="Personalize"
            onPress={onPersonalize}
          />
          <ThemeText
            variant="caption"
            themeColor="textMuted"
            style={styles.timeText}
          >
            Takes 1 min
          </ThemeText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    marginVertical: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    marginBottom: 2,
  },
  ctaWrapper: {
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  timeText: {
    fontSize: 10,
  },
});
