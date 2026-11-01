import { type ReactNode, useEffect } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Duration, Easings, PressScale } from '@/theme/motion';

/**
 * Shared motion. Only transform and opacity animate, on the UI thread; with
 * the system Reduce Motion setting on, everything here becomes instant.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Release: settles quickly with no visible wobble. */
const RELEASE_SPRING = { dampingRatio: 0.8, duration: 200 } as const;
/** Save: a small overshoot that reads as delight. */
const POP_SPRING = { dampingRatio: 0.45, duration: 280 } as const;

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while pressed. */
  scaleTo?: number;
}

/** A pressable that shrinks slightly under the finger. */
export function PressableScale({
  children,
  style,
  scaleTo = PressScale,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        if (!reduceMotion) {
          scale.value = withTiming(scaleTo, {
            duration: Duration.press,
            easing: Easings.standard,
          });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!reduceMotion) scale.value = withSpring(1, RELEASE_SPRING);
        onPressOut?.(event);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Only the first screenful animates in; later items appear at once. */
const ENTRANCE_LIMIT = 6;
const ENTRANCE_STAGGER_MS = 40;
const ENTRANCE_RISE = 12;

/**
 * A short rise and fade for the item at `index` in a list, staggered for the
 * first few items. Opacity and transform only: unlike layout `entering`
 * animations (which position items absolutely on the web while they run),
 * it never moves the layout.
 */
export function Entrance({
  index,
  children,
  style,
}: {
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const animate = index < ENTRANCE_LIMIT && !reduceMotion;
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    progress.value = withDelay(
      index * ENTRANCE_STAGGER_MS,
      withTiming(1, { duration: Duration.screen, easing: Easings.standard }),
    );
  }, [animate, index, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * ENTRANCE_RISE }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** A quick grow and settle when `active` turns on, e.g. a save. */
export function Pop({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (active && !reduceMotion) {
      scale.value = withSequence(
        withTiming(1.25, { duration: 100 }),
        withSpring(1, POP_SPRING),
      );
    }
  }, [active, reduceMotion, scale]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}
