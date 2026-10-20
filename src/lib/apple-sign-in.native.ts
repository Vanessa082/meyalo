import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export interface AppleCredential {
  identityToken: string;
  /** The raw nonce; Apple signed its SHA-256 into the identity token. */
  nonce: string;
}

/** Sign in with Apple exists only on iOS. */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

/**
 * The native Apple sheet, asking for the email only (the spec's basic
 * identity). Null when the person cancels. UNVERIFIED on a device: Apple
 * gets the SHA-256 of the nonce and Supabase the raw nonce, as in
 * Supabase's Flutter guide; check before release.
 */
export async function signInWithApple(): Promise<AppleCredential | null> {
  const nonce = Array.from(Crypto.getRandomBytes(32), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  );
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!credential.identityToken) {
      throw new Error('Apple returned no identity token.');
    }
    return { identityToken: credential.identityToken, nonce };
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      return null;
    }
    throw error;
  }
}
