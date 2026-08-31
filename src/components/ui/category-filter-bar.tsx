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

export interface FilterItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

export const CATEGORIES: FilterItem[] = [
  { id: 'all', label: 'All', icon: Grid },
  { id: 'work', label: 'Work & Career', icon: Briefcase },
  { id: 'business', label: 'Business', icon: TrendingUp },
  { id: 'learning', label: 'Learning', icon: BookOpen },
];

interface CategoryFilterBarProps {
  selectedId?: string;
  onSelectCategory?: (id: string) => void;
}

export function CategoryFilterBar({
  selectedId: externalSelectedId,
  onSelectCategory,
}: CategoryFilterBarProps) {
  const colors = useTheme();
  const [internalSelectedId, setInternalSelectedId] = useState('all');

  const selectedId = externalSelectedId ?? internalSelectedId;

  const handleSelect = (id: string) => {
    setInternalSelectedId(id);
    onSelectCategory?.(id);
  };

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
              onPress={() => handleSelect(cat.id)}
              style={[
                styles.chip,
                isSelected
                  ? { backgroundColor: colors.primary }
                  : {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
              ]}
            >
              <IconComponent
                size={14}
                color={isSelected ? colors.textInverse : colors.textSecondary}
              />
              <ThemeText
                variant="captionBold"
                style={[
                  styles.chipText,
                  {
                    color: isSelected
                      ? colors.textInverse
                      : colors.textSecondary,
                  },
                ]}
              >
                {cat.label}
              </ThemeText>
            </Pressable>
          );
        })}

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
    marginBottom: 16,
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
