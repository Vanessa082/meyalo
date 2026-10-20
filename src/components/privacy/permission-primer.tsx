import {
  Bell,
  CalendarPlus,
  Check,
  type LucideIcon,
  X,
} from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/ui/icon-circle';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { Radius, Spacing } from '@/theme';

export type PermissionKind = 'notifications' | 'calendar';

interface PermissionPrimerProps {
  kind: PermissionKind;
  visible: boolean;
  /** Then the system prompt is shown. */
  onAllow: () => void;
  onNotNow: () => void;
}

const ICON: Record<PermissionKind, LucideIcon> = {
  notifications: Bell,
  calendar: CalendarPlus,
};

/**
 * Our own explanation right before a system permission prompt (docs/
 * product-decisions.md, "Before any system permission"): what it is for,
 * what it never does, Allow or Not now. Never shown at launch.
 */
export function PermissionPrimer({
  kind,
  visible,
  onAllow,
  onNotNow,
}: PermissionPrimerProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onNotNow}
    >
      <View style={styles.fill}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onNotNow}
          accessibilityRole="button"
          accessibilityLabel={t('permission.notNow')}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <IconCircle icon={ICON[kind]} size="lg" />
          <Text variant="title2" accessibilityRole="header">
            {t(`permission.${kind}.title`)}
          </Text>
          <Point icon={Check} text={t(`permission.${kind}.purpose`)} />
          <Point icon={X} text={t(`permission.${kind}.never`)} />
          <Text variant="footnote" tone="muted">
            {t('permission.later')}
          </Text>
          <Button title={t('permission.allow')} onPress={onAllow} fullWidth />
          <Button
            title={t('permission.notNow')}
            variant="ghost"
            onPress={onNotNow}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}

function Point({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  const colors = useTheme();
  return (
    <View style={styles.point}>
      <Icon size={18} color={colors.textMuted} strokeWidth={2.5} />
      <Text variant="callout" style={styles.pointText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  point: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  pointText: {
    flex: 1,
  },
});
