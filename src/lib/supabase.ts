import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { requireSupabaseConfig } from '@/config/env';
import { sessionStorage } from './session-storage';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = requireSupabaseConfig();

// Static web rendering runs this module in Node, where AsyncStorage's web
// implementation (localStorage) does not exist. There is no session there.
const isServerRender = typeof window === 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServerRender ? undefined : sessionStorage,
    autoRefreshToken: !isServerRender,
    persistSession: !isServerRender,
    detectSessionInUrl: false,
  },
});

// Phones refresh the session only while the app is in use; the web refreshes
// in the background on its own.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
