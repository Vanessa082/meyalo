import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { ThemeText } from '@/components/ui/theme-text';
import { useTheme } from '@/hooks/use-theme';
import {
  EventRuleError,
  EventValidationError,
} from '@/services/event-curation';
import {
  type EventRepositoryErrorKind,
  isEventRepositoryError,
} from '@/services/event-repository';

const KIND_MESSAGES: Record<EventRepositoryErrorKind, string> = {
  not_found: 'This event does not exist or this account cannot see it.',
  invalid_input: 'The database rejected the values.',
  unauthorized: 'This account is not allowed to do that.',
  conflict: 'Someone changed this event after you loaded it. Reload it first.',
  unavailable: 'The event database could not be reached.',
};

/** One sentence a curator can act on, plus the server detail if any. */
export function describeError(error: unknown): string {
  if (error instanceof EventValidationError) return error.message;
  if (error instanceof EventRuleError) return error.message;
  if (isEventRepositoryError(error)) {
    const base = KIND_MESSAGES[error.kind];
    return error.message && error.message !== base
      ? `${base} (${error.message})`
      : base;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <ThemeText variant="captionBold" themeColor="textMuted">
        {title.toUpperCase()}
      </ThemeText>
      {children}
    </View>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.row}>
      <ThemeText variant="caption" themeColor="textMuted" style={styles.label}>
        {label}
      </ThemeText>
      <View style={styles.value}>
        {typeof value === 'string' ? (
          <ThemeText variant="caption" selectable>
            {value}
          </ThemeText>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

type BadgeTone = 'neutral' | 'positive' | 'warning' | 'critical';

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: BadgeTone;
}) {
  const colors = useTheme();
  const color = {
    neutral: colors.textMuted,
    positive: colors.success,
    warning: colors.warning,
    critical: colors.error,
  }[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <ThemeText variant="captionBold" style={{ color }}>
        {label}
      </ThemeText>
    </View>
  );
}

export function Banner({
  tone,
  message,
}: {
  tone: 'error' | 'success' | 'info';
  message: string;
}) {
  const colors = useTheme();
  const color =
    tone === 'error'
      ? colors.error
      : tone === 'success'
        ? colors.success
        : colors.textMuted;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { borderColor: color }]}
    >
      <ThemeText variant="caption" style={{ color }}>
        {message}
      </ThemeText>
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  const colors = useTheme();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} />
      <ThemeText variant="caption" themeColor="textMuted">
        {label}
      </ThemeText>
    </View>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.state}>
      <Banner tone="error" message={describeError(error)} />
      {onRetry ? (
        <Button
          title="Retry"
          variant="outline"
          size="small"
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.state}>
      <ThemeText variant="caption" themeColor="textMuted">
        {message}
      </ThemeText>
    </View>
  );
}

export function Field({
  label,
  error,
  hint,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const colors = useTheme();
  return (
    <View style={styles.field}>
      <ThemeText variant="captionBold">{label}</ThemeText>
      <TextInput
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        accessibilityLabel={label}
        {...input}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: error ? colors.error : colors.border,
            backgroundColor: colors.background,
          },
          input.multiline ? styles.multiline : null,
        ]}
      />
      {hint && !error ? (
        <ThemeText variant="caption" themeColor="textMuted">
          {hint}
        </ThemeText>
      ) : null}
      {error ? (
        <ThemeText variant="caption" themeColor="error">
          {error}
        </ThemeText>
      ) : null}
    </View>
  );
}

export function Choices<T extends string>({
  label,
  options,
  selected,
  onToggle,
  error,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  selected: readonly string[];
  onToggle: (value: T) => void;
  error?: string;
}) {
  const colors = useTheme();
  return (
    <View style={styles.field}>
      <ThemeText variant="captionBold">{label}</ThemeText>
      <View style={styles.choices}>
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${label}: ${option.label}`}
              onPress={() => onToggle(option.value)}
              style={[
                styles.choice,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primarySoft : 'transparent',
                },
              ]}
            >
              <ThemeText
                variant="caption"
                themeColor={active ? 'primary' : 'text'}
              >
                {option.label}
              </ThemeText>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <ThemeText variant="caption" themeColor="error">
          {error}
        </ThemeText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  label: {
    width: 150,
  },
  value: {
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  banner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  state: {
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  field: {
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choice: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
