import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from '@/services/key-value-store';

/**
 * The one place that chooses how data is kept on the phone. Stores, the
 * offline cache and the language choice all receive this through the
 * KeyValueStore interface, so moving to another engine (for example MMKV)
 * changes this file only.
 *
 * Not for secrets: sign-in tokens belong in secure storage (Feature 4) and
 * get their own binding when accounts are built.
 */
export const deviceStorage: KeyValueStore = AsyncStorage;
