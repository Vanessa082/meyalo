import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { appleSignInAvailable } from '@/lib/apple-sign-in';
import { Radius, TouchTargets } from '@/theme';

/** Apple's own button (its guidelines), shown only where Apple sign-in works. */
export function AppleButton({ onPress }: { onPress: () => void }) {
  const scheme = useColorScheme();
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    appleSignInAvailable()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);
  if (!available) return null;
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        scheme === 'dark'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={Radius.full}
      style={styles.button}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: TouchTargets.minimum + 8,
  },
});
