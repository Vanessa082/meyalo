import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, TouchTargets } from '@/theme';
import { BrandFill } from './brand-fill';
import { focusRing } from './focus';
import { Text } from './text';

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testID?: string;
}

const BOX = 22;

/**
 * A box with its label, the whole row pressable. Starts unticked wherever it
 * records agreement: consent is never assumed.
 */
export function Checkbox({ label, checked, onChange, testID }: CheckboxProps) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      testID={testID}
      style={(state) => [styles.row, focusRing(state, colors)]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? colors.selected : colors.surface,
            borderColor: checked ? 'transparent' : colors.border,
          },
          checked && styles.clip,
        ]}
      >
        {checked ? <BrandFill /> : null}
        {checked ? (
          <Check size={16} strokeWidth={3} color={colors.onSelected} />
        ) : null}
      </View>
      <Text variant="callout" style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: TouchTargets.minimum,
    borderRadius: Radius.sm,
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
  clip: {
    overflow: 'hidden',
  },
});
