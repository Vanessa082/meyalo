import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config. Environment-dependent values are read here and nowhere
 * else is a host hardcoded. See docs/environment.md.
 */
function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function appHost(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) return undefined;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return url.host;
  } catch {
    return undefined;
  }
}

const googleMapsApiKey = present(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
const host = appHost(present(process.env.EXPO_PUBLIC_APP_BASE_URL));

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'meyalo',
  slug: 'meyalo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/brand/app-icon/app-icon-1024.png',
  scheme: 'meyalo',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/brand/app-icon/ios-icon-1024.png',
    bundleIdentifier: 'com.meyalo.app',
    supportsTablet: true,
    usesAppleSignIn: true,
    associatedDomains: host ? [`applinks:${host}`] : undefined,
  },
  android: {
    package: 'com.meyalo.app',
    adaptiveIcon: {
      backgroundColor: '#087F73',
      foregroundImage: './assets/brand/app-icon/adaptive-icon-foreground.png',
      monochromeImage: './assets/brand/app-icon/monochrome-icon.png',
    },
    predictiveBackGestureEnabled: false,
    config: googleMapsApiKey
      ? { googleMaps: { apiKey: googleMapsApiKey } }
      : undefined,
    intentFilters: host
      ? [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [{ scheme: 'https', host, pathPrefix: '/' }],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ]
      : undefined,
  },
  web: {
    output: 'static',
    favicon: './assets/brand/favicon/favicon-32x32.png',
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7F9F7',
        image: './assets/brand/mark/meyalo-mark-teal-512.png',
        imageWidth: 120,
        dark: {
          backgroundColor: '#142428',
          image: './assets/brand/mark/meyalo-mark-white-512.png',
        },
      },
    ],
    'expo-font',
    'expo-localization',
    googleMapsApiKey
      ? ['react-native-maps', { iosGoogleMapsApiKey: googleMapsApiKey }]
      : 'react-native-maps',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
