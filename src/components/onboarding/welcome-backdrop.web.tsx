import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { decorativeVideoAllowed } from '@/services/decorative-video';
import { Palette } from '@/theme/colors';

const STILL = require('@/assets/brand/motion/welcome-still.webp');

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function videoAllowed(): boolean {
  const connection = (
    navigator as Navigator & { connection?: NetworkInformation }
  ).connection;
  return decorativeVideoAllowed({
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
  });
}

/**
 * Web: the still frame paints at once (it is in the static HTML); the 25 KB
 * loop is only requested after the page has loaded, and only when motion is
 * allowed and the connection is not slow or in data-saving mode. It fades in
 * over the still once it actually plays, so there is never a blank moment.
 */
/** Fills its parent (absolute), behind the welcome content. */
export function WelcomeBackdrop() {
  const [load, setLoad] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (videoAllowed()) setLoad(true);
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.frame]} aria-hidden>
      <Image
        source={STILL}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={{ left: '40%', top: '50%' }}
      />
      {load ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          // The first frame equals the still, so showing it as soon as it can
          // play is seamless (and works where 'playing' fires late).
          onCanPlay={() => setPlaying(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // The speaker stands left of centre in the landscape clip.
            objectPosition: '40% center',
            opacity: playing ? 1 : 0,
            transition: 'opacity 400ms ease-out',
          }}
        >
          <source src="/media/welcome-loop.webm" type="video/webm" />
          <source src="/media/welcome-loop.mp4" type="video/mp4" />
        </video>
      ) : null}
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
