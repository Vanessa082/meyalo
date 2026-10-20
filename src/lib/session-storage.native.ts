import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AESEncryptionKey,
  AESKeySize,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createSealedStorage, type SessionCipher } from './sealed-storage';

const KEY_NAME = 'meyalo.sessionKey.v1';
// Only while the phone is unlocked, and never copied to another device.
const KEY_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

async function loadKey(): Promise<AESEncryptionKey> {
  const stored = await SecureStore.getItemAsync(KEY_NAME, KEY_OPTIONS);
  if (stored) return AESEncryptionKey.import(stored, 'base64');
  const key = await AESEncryptionKey.generate(AESKeySize.AES256);
  await SecureStore.setItemAsync(
    KEY_NAME,
    await key.encoded('base64'),
    KEY_OPTIONS,
  );
  return key;
}

let key: Promise<AESEncryptionKey> | null = null;

/** AES-256-GCM: a changed byte fails to open instead of reading wrongly. */
async function cipher(): Promise<SessionCipher> {
  key ??= loadKey().catch((error: unknown) => {
    key = null;
    throw error;
  });
  const current = await key;
  return {
    seal: async (plain) =>
      (await aesEncryptAsync(plain, current)).combined('base64'),
    open: async (sealed) =>
      aesDecryptAsync(AESSealedData.fromCombined(sealed), current, {
        output: 'bytes',
      }),
  };
}

/** The sign-in session on phones: sealed, key in secure storage. */
export const sessionStorage = createSealedStorage(AsyncStorage, cipher);
