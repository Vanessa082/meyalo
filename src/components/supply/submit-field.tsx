import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';

/** Labelled input for the public suggestion form. */
export function SubmitField({
  label,
  hint,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  const colors = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      {hint ? (
        <Text variant="footnote" tone="muted">
          {hint}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        {...input}
        style={[
          styles.input,
          input.multiline ? styles.multiline : null,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    // 16px stops iOS from zooming into the field on focus.
    fontSize: 16,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
