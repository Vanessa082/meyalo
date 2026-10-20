import { EyeOff } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import {
  HIDDEN_REASONS,
  type HiddenReason,
} from '@/services/hidden-events-store';

interface HiddenEventPanelProps {
  title: string;
  reason: HiddenReason | null;
  onUndo: () => void;
  /** Tapping the selected reason again clears it. */
  onReason: (reason: HiddenReason | null) => void;
}

/**
 * Takes a hidden card's place in the feed until the user leaves the screen:
 * Undo, then an optional one-tap reason.
 */
export function HiddenEventPanel({
  title,
  reason,
  onUndo,
  onReason,
}: HiddenEventPanelProps) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <Card variant="outlined" padding="md">
      <Stack gap="md">
        <Stack direction="row" gap="md" align="center">
          <EyeOff size={18} color={colors.textMuted} strokeWidth={1.8} />
          <Stack gap="xxs" style={{ flex: 1 }}>
            <Text variant="headline">{t('notInterested.hidden')}</Text>
            <Text variant="footnote" tone="muted" numberOfLines={1}>
              {title}
            </Text>
          </Stack>
          <Button
            title={t('notInterested.undo')}
            accessibilityLabel={t('notInterested.undoLabel', { title })}
            variant="ghost"
            size="small"
            onPress={onUndo}
          />
        </Stack>

        <Stack gap="sm">
          <Text variant="footnote" tone="muted">
            {reason ? t('notInterested.thanks') : t('notInterested.why')}
          </Text>
          <Stack
            direction="row"
            gap="sm"
            wrap
            role="radiogroup"
            aria-label={t('notInterested.reasonsLabel')}
          >
            {HIDDEN_REASONS.map((option) => (
              <Chip
                key={option}
                role="radio"
                label={t(`notInterested.${option}`)}
                selected={reason === option}
                onPress={() => onReason(reason === option ? null : option)}
              />
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
