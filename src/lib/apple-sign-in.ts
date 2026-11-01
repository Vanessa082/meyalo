export interface AppleCredential {
  identityToken: string;
  nonce: string;
}

/** Web and Android: Sign in with Apple is iOS only here. */
export async function appleSignInAvailable(): Promise<boolean> {
  return false;
}

export async function signInWithApple(): Promise<AppleCredential | null> {
  return null;
}
