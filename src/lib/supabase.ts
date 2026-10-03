import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseConfig } from '@/config/env';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = requireSupabaseConfig();

// Static web rendering runs this module in Node, where AsyncStorage's web
// implementation (localStorage) does not exist. There is no session there.
const isServerRender = typeof window === 'undefined';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServerRender ? undefined : AsyncStorage,
    autoRefreshToken: !isServerRender,
    persistSession: !isServerRender,
    detectSessionInUrl: false,
  },
});
