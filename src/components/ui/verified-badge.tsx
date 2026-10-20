import { BadgeCheck } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import type { VerificationState } from '@/types/event.type';

/**
 * The verified seal (scalloped badge with a check, the pattern people know
 * from social networks). Brand blue when the organiser confirmed the event,
 * grey when we confirmed it at the official source; nothing otherwise. Decorative:
 * the trust label beside it says the same in words.
 */
export function VerifiedBadge({
  state,
  size = 18,
}: {
  state: VerificationState | undefined;
  size?: number;
}) {
  const colors = useTheme();
  if (state !== 'organizer_confirmed' && state !== 'source_confirmed') {
    return null;
  }
  const fill =
    state === 'organizer_confirmed' ? colors.highlight : colors.textMuted;
  const mark =
    state === 'organizer_confirmed' ? colors.onHighlight : colors.background;
  return (
    <BadgeCheck
      size={size}
      fill={fill}
      color={mark}
      strokeWidth={2}
      aria-hidden
    />
  );
}
