/**
 * Public client configuration.
 *
 * Expo only inlines EXPO_PUBLIC_* variables when they are read by their
 * literal name, so each one is referenced directly. These values ship in
 * the app. Never put secrets (service-role keys, provider API keys) here.
 */

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const publicEnv = {
  supabaseUrl: present(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: present(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  appBaseUrl: normalizeBaseUrl(process.env.EXPO_PUBLIC_APP_BASE_URL),
  googleMapsApiKey: present(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
};

export function requireSupabaseConfig(): { url: string; anonKey: string } {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. See docs/environment.md.',
    );
  }
  return { url: publicEnv.supabaseUrl, anonKey: publicEnv.supabaseAnonKey };
}

/**
 * Public site origin from configuration. Unset is allowed until a host is chosen.
 * Malformed values throw so a bad deploy fails loudly.
 */
export function normalizeBaseUrl(raw: string | undefined): string | undefined {
  const value = present(raw);
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('EXPO_PUBLIC_APP_BASE_URL is not a valid URL.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('EXPO_PUBLIC_APP_BASE_URL must use http or https.');
  }

  return url.origin;
}

export function joinPublicUrl(
  baseUrl: string | undefined,
  path: string,
): string | null {
  if (!baseUrl) return null;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl.replace(/\/$/, '')}${suffix}`;
}

export function publicUrl(path: string): string | null {
  return joinPublicUrl(publicEnv.appBaseUrl, path);
}
