import { AlertCircle, AlertTriangle, Info } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';
import { Button } from './button';
import { Text } from './text';

export type InlineMessageTone = 'error' | 'warning' | 'info';

export interface InlineMessageProps {
  tone: InlineMessageTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * A message tied to the content around it, such as a failed save. Announced
 * to screen readers when it appears.
 */
export function InlineMessage({
  tone,
  message,
  actionLabel,
  onAction,
}: InlineMessageProps) {
  const colors = useTheme();
  const palette = {
    error: { bg: colors.errorSoft, fg: colors.error, Icon: AlertCircle },
    warning: {
      bg: colors.warningSoft,
      fg: colors.warningText,
      Icon: AlertTriangle,
    },
    info: { bg: colors.surfaceSunken, fg: colors.textSecondary, Icon: Info },
  }[tone];

  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.container, { backgroundColor: palette.bg }]}
    >
      <palette.Icon size={18} color={palette.fg} style={styles.icon} />
      <Text variant="callout" style={[styles.message, { color: palette.fg }]}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          variant="ghost"
          size="small"
          onPress={onAction}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRadius: Radius.md,
  },
  icon: {
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  message: {
    flex: 1,
  },
});
