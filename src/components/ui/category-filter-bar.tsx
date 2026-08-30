import {
  BookOpen,
  Briefcase,
  Grid,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemeText } from './theme-text';

interface FilterItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const CATEGORIES: FilterItem[] = [
  { id: 'all', label: 'All', icon: Grid },
  { id: 'work', label: 'Work & Career', icon: Briefcase },
  { id: 'business', label: 'Business', icon: TrendingUp },
  { id: 'learning', label: 'Learning', icon: BookOpen },
];

export function CategoryFilterBar() {
  const colors = useTheme();
  const [selectedId, setSelectedId] = useState('all');

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = cat.id === selectedId;
          const IconComponent = cat.icon;

          return (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedId(cat.id)}
              style={[
                styles.chip,
                isSelected
                  ? { backgroundColor: '#087F73' }
                  : {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
              ]}
            >
              <IconComponent
                size={14}
                color={isSelected ? '#FFFFFF' : colors.textSecondary}
              />
              <ThemeText
                variant="captionBold"
                style={[
                  styles.chipText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {cat.label}
              </ThemeText>
            </Pressable>
          );
        })}

        {/* Filter settings button icon */}
        <Pressable
          style={[
            styles.filterIconButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <SlidersHorizontal size={16} color={colors.textSecondary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  scrollContent: {
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
  },
  filterIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
