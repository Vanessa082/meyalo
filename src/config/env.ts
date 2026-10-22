/**
 * Public client configuration.
 *
 * Expo only inlines EXPO_PUBLIC_* variables when they are read by their
 * literal name, so each one is referenced directly. These values ship in
 * the app. Never put secrets (service-role keys, provider API keys) here.
 */

import { httpsHost } from '../services/url.ts';

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const DEFAULT_GEOCODER_URL = 'https://nominatim.openstreetmap.org';

export const publicEnv = {
  supabaseUrl: present(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: present(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  appBaseUrl: normalizeBaseUrl(process.env.EXPO_PUBLIC_APP_BASE_URL),
  googleMapsApiKey: present(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
  privacyPolicyUrl: httpsOnly(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL),
  termsUrl: httpsOnly(process.env.EXPO_PUBLIC_TERMS_URL),
  geocoderUrl: geocoderBaseUrl(process.env.EXPO_PUBLIC_GEOCODER_URL),
  /** "true" once the translate-event function has a provider key
   *  (docs/environment.md). Until then the Translate action is hidden. */
  translationEnabled: process.env.EXPO_PUBLIC_TRANSLATION_ENABLED === 'true',
  /** Website (docs/product-decisions.md, Feature 20). Each is shown only
   *  when set, so nothing points at a store page or chat that does not exist. */
  playStoreUrl: httpsOnly(process.env.EXPO_PUBLIC_PLAY_STORE_URL),
  appStoreUrl: httpsOnly(process.env.EXPO_PUBLIC_APP_STORE_URL),
  whatsappChannelUrl: httpsOnly(process.env.EXPO_PUBLIC_WHATSAPP_CHANNEL_URL),
  /** International number for "Chat with us on WhatsApp", digits only. */
  contactWhatsApp: whatsAppNumber(process.env.EXPO_PUBLIC_CONTACT_WHATSAPP),
};

/**
 * Venue search for curators. Unset uses the public OpenStreetMap Nominatim
 * service; "off" disables it (the usage policy requires being able to switch
 * it off on request); any other https origin points at another Nominatim.
 */
export function geocoderBaseUrl(raw: string | undefined): string | null {
  const value = present(raw);
  if (!value) return DEFAULT_GEOCODER_URL;
  if (value.toLowerCase() === 'off') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

/** Legal and store links are shown only once a real https page is configured. */
export function httpsOnly(raw: string | undefined): string | undefined {
  const value = present(raw);
  return value && httpsHost(value) ? value : undefined;
}

/**
 * A WhatsApp number in international form, kept as digits for wa.me links.
 * Spaces, dashes, dots and a leading + are allowed; anything else, or fewer
 * than 8 or more than 15 digits (E.164), reads as unset.
 */
export function whatsAppNumber(raw: string | undefined): string | undefined {
  const value = present(raw);
  if (!value || !/^\+?[\d\s().-]+$/.test(value)) return undefined;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : undefined;
}

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
