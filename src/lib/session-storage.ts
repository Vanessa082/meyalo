import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from '@/services/key-value-store';

/**
 * Web: the browser has no secure storage, so the session stays in its
 * storage, as for the curator console. Phones use session-storage.native.ts.
 */
export const sessionStorage: KeyValueStore = AsyncStorage;
