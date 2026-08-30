import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';

interface ForYouSectionHeaderProps {
  title: string;
  actionText?: string;
  onPressAction?: () => void;
}

export function ForYouSectionHeader({
  title,
  actionText = 'See all',
  onPressAction,
}: ForYouSectionHeaderProps) {
  const colors = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <ThemeText
        variant="header"
        style={[styles.sectionTitle, { color: colors.text }]}
      >
        {title}
      </ThemeText>
      {onPressAction && (
        <Pressable style={styles.seeAllButton} onPress={onPressAction}>
          <ThemeText variant="captionBold" style={styles.seeAllText}>
            {actionText}
          </ThemeText>
          <ChevronRight size={14} color="#64748B" strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: '#64748B',
  },
});
