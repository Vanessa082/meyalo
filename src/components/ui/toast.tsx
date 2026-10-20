import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Duration, Radius, Shadows, Spacing } from '@/theme';
import { Text } from './text';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  tone: ToastTone;
  message: string;
  /** For example "Retry" or "Undo". */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState extends ToastOptions {
  id: number;
}

interface ToastApi {
  show: (options: ToastOptions) => void;
}

/** Long enough to read a sentence; longer when there is an action to take. */
const VISIBLE_MS = 4000;
const VISIBLE_WITH_ACTION_MS = 7000;
/** Keeps the toast above the tab bar. */
const BOTTOM_OFFSET = 80;

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Short confirmation of something that already happened ("Report sent"), or
 * of a failure with a way to recover. One toast at a time: a new one replaces
 * the current one. Never used to claim success before the work succeeded.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
    // iOS does not announce live regions; announce explicitly everywhere.
    AccessibilityInfo.announceForAccessibility(options.message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.actionLabel ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS;
    const timer = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(timer);
  }, [toast]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <ToastView
          key={toast.id}
          toast={toast}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used within ToastProvider');
  return api;
}

function ToastView({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const colors = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const insets = useSafeAreaInsets();
  const Icon =
    toast.tone === 'success'
      ? CheckCircle2
      : toast.tone === 'error'
        ? AlertCircle
        : Info;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { bottom: insets.bottom + BOTTOM_OFFSET }]}
    >
      {/* Reanimated layout animations follow the system reduce-motion setting. */}
      <Animated.View
        entering={FadeInDown.duration(Duration.state)}
        exiting={FadeOut.duration(Duration.press)}
        accessibilityRole={toast.tone === 'error' ? 'alert' : undefined}
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          Shadows[scheme].medium,
          { backgroundColor: colors.text },
        ]}
      >
        <Icon size={18} color={colors.textInverse} />
        <Text
          variant="callout"
          style={[styles.message, { color: colors.textInverse }]}
        >
          {toast.message}
        </Text>
        {toast.actionLabel && toast.onAction ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              toast.onAction?.();
              onDismiss();
            }}
            style={styles.action}
          >
            <Text variant="label" style={{ color: colors.textInverse }}>
              {toast.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
    maxWidth: 480,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  message: {
    flex: 1,
  },
  action: {
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
});
