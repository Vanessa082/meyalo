import type { ReactNode } from 'react';
import {
  type StyleProp,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { Spacing } from '@/theme';

type SpaceName = Exclude<keyof typeof Spacing, 'layoutPage' | 'layoutCard'>;

interface StackProps {
  children: ReactNode;
  /** Space between children, from the 4px scale. */
  gap?: SpaceName;
  direction?: 'column' | 'row';
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  /** For a group of choices, e.g. `radiogroup`, with its label. */
  role?: ViewProps['role'];
  'aria-label'?: string;
}

/**
 * Lays children out with a fixed gap. The parent owns the space between its
 * children (gap); children never add outer margins. That keeps spacing in one
 * place and avoids doubled or collapsing gaps.
 */
export function Stack({
  children,
  gap = 'md',
  direction = 'column',
  align,
  justify,
  wrap = false,
  style,
  role,
  'aria-label': ariaLabel,
}: StackProps) {
  return (
    <View
      role={role}
      aria-label={ariaLabel}
      style={[
        {
          flexDirection: direction,
          gap: Spacing[gap],
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
