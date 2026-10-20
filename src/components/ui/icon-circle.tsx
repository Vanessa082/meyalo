import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius } from '@/theme';

const SIZES = {
  md: { box: 40, icon: 20 },
  lg: { box: 56, icon: 28 },
} as const;

interface IconCircleProps {
  icon: LucideIcon;
  size?: keyof typeof SIZES;
  /** soft: tinted brand background; surface: the card surface. */
  tone?: 'soft' | 'surface';
}

/** An icon in a circle, the same everywhere it is used as a visual anchor. */
export function IconCircle({
  icon: Icon,
  size = 'md',
  tone = 'soft',
}: IconCircleProps) {
  const colors = useTheme();
  const { box, icon } = SIZES[size];
  return (
    <View
      style={[
        styles.circle,
        {
          width: box,
          height: box,
          backgroundColor:
            tone === 'soft' ? colors.primarySoft : colors.surface,
        },
      ]}
    >
      <Icon size={icon} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
