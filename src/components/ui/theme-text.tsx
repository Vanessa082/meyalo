import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { ThemeTextProps } from '@/types/theme.type';

export function ThemeText({
  children,
  style,
  numberOfLines,
  variant = 'body',
  onPress,
}: ThemeTextProps) {
  const colors = useTheme();

  const textColor =
    variant === 'caption' || variant === 'captionBold'
      ? colors.textMuted
      : variant === 'link'
        ? colors.textLink
        : colors.text;

  const textStyle = [styles[variant], { color: textColor }, style];

  return (
    <Text style={textStyle} numberOfLines={numberOfLines} onPress={onPress}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
