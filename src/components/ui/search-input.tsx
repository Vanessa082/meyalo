import { Search, X } from 'lucide-react-native';
import { type Ref, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, TextStyles, TouchTargets } from '@/theme';
import { IconButton } from './icon-button';

export interface SearchInputProps
  extends Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> {
  value: string;
  onChangeText: (value: string) => void;
  /** Accessible name; the placeholder is not announced reliably. */
  accessibilityLabel: string;
  clearLabel: string;
  ref?: Ref<TextInput>;
}

export function SearchInput({
  value,
  onChangeText,
  accessibilityLabel,
  clearLabel,
  onFocus,
  onBlur,
  ref,
  ...rest
}: SearchInputProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: focused ? colors.borderStrong : colors.border,
        },
      ]}
    >
      <Search size={18} color={colors.textMuted} />
      <TextInput
        {...rest}
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        autoCorrect={false}
        returnKeyType="search"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, TextStyles.body, { color: colors.text }]}
      />
      {value ? (
        <IconButton
          icon={<X size={18} color={colors.textMuted} />}
          accessibilityLabel={clearLabel}
          onPress={() => onChangeText('')}
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
    minHeight: TouchTargets.recommended,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xxs,
    borderRadius: Radius.input,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    minHeight: TouchTargets.minimum,
    paddingVertical: 0,
  },
});
