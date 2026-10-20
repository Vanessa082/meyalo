import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { Palette } from '@/theme/colors';

const STILL = require('@/assets/brand/motion/welcome-still.webp');
/** Ships inside the app (about 120 KB), so playing it downloads nothing:
 *  only Reduce Motion stops it. iPhones need MP4, not WebM. */
const LOOP = require('@/assets/brand/motion/welcome-loop.mp4');
const FADE_MS = 400;

/**
 * Phones: the still frame at once, then the muted loop fades in over it once
 * it is actually playing. With Reduce Motion on, the still stays.
 */
export function WelcomeBackdrop() {
  const reduceMotion = useReduceMotion();
  const player = useVideoPlayer(LOOP, (created) => {
    created.loop = true;
    created.muted = true;
    // Never stop someone's music for a silent background.
    created.audioMixingMode = 'mixWithOthers';
  });
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  useEffect(() => {
    if (reduceMotion) player.pause();
    else player.play();
  }, [player, reduceMotion]);

  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(isPlaying && !reduceMotion ? 1 : 0, {
      duration: FADE_MS,
    });
  }, [isPlaying, reduceMotion, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.frame]} aria-hidden>
      <Image
        source={STILL}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={{ left: '40%', top: '50%' }}
      />
      <Animated.View style={[StyleSheet.absoluteFill, fade]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    // The loop's own background, so the box is never an empty flash.
    backgroundColor: Palette.ink,
  },
});
