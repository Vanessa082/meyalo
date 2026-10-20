import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';
import { Text } from './text';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onPressAction?: () => void;
}

export function SectionHeader({
  title,
  actionText,
  onPressAction,
}: SectionHeaderProps) {
  const colors = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <Text variant="title2" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {onPressAction && actionText ? (
        <Pressable
          style={styles.action}
          onPress={onPressAction}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text variant="label" tone="primary">
            {actionText}
          </Text>
          <ChevronRight size={16} color={colors.primary} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    flex: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
});
