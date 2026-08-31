import { ThemedText, type ThemedTextProps } from '../themed-text';

export type ThemeTextProps = ThemedTextProps;

/**
 * ThemeText
 *
 * Re-exports the unified, token-based typography component `ThemedText`.
 */
export function ThemeText(props: ThemeTextProps) {
  return <ThemedText {...props} />;
}
