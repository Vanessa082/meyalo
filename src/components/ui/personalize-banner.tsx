/**
 * PersonalizeBanner
 *
 * Dismissable prompt to personalise the feed. Two rows so the text keeps the
 * full width on any screen: icon, words and close on top; the action and how
 * long it takes underneath.
 */
import { Wand2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { Spacing, TouchTargets } from '@/theme';
import { Button } from './button';
import { Card } from './card';
import { IconCircle } from './icon-circle';
import { Stack } from './stack';
import { Text } from './text';

const CLOSE_ICON = 18;

interface PersonalizeBannerProps {
  onPersonalize?: () => void;
}

export function PersonalizeBanner({ onPersonalize }: PersonalizeBannerProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Card
      variant="flat"
      padding="md"
      style={{ backgroundColor: colors.primarySoft }}
    >
      <Stack gap="md">
        <Stack direction="row" gap="md" align="flex-start">
          <IconCircle icon={Wand2} tone="surface" />
          <View style={styles.text}>
            <Text variant="headline" accessibilityRole="header">
              {t('forYou.personalizeTitle')}
            </Text>
            <Text variant="footnote" tone="muted">
              {t('forYou.personalizeBody')}
            </Text>
          </View>
          <Pressable
            onPress={() => setIsVisible(false)}
            hitSlop={(TouchTargets.minimum - CLOSE_ICON) / 2}
            accessibilityRole="button"
            accessibilityLabel={t('forYou.dismiss')}
          >
            <X size={CLOSE_ICON} color={colors.textMuted} strokeWidth={2} />
          </Pressable>
        </Stack>

        <Stack direction="row" gap="md" align="center" wrap>
          <Button
            size="small"
            variant="primary"
            title={t('forYou.personalizeAction')}
            onPress={onPersonalize}
          />
          <Text variant="caption" tone="muted">
            {t('forYou.personalizeTime')}
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  text: {
    flex: 1,
    gap: Spacing.xxs,
  },
});
