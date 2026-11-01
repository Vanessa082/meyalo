import type { ThemeColors } from '@/theme/colors';
import { webColors } from '@/theme/css-vars';

/**
 * Web: colours are CSS variables set for light and dark in the page head
 * (app/+html.tsx), so the browser applies the visitor's scheme from the first
 * paint and the static HTML never flashes the other theme.
 */
export function useTheme(): ThemeColors {
  return webColors;
}

export type Theme = ThemeColors;
