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
    config: {
      // Only standard HTTPS/OS encryption is used, so no export documentation
      // is needed. Sets ITSAppUsesNonExemptEncryption in Info.plist.
      usesNonExemptEncryption: false,
    },
    // Merged into PrivacyInfo.xcprivacy. CA92.1: UserDefaults is read and
    // written only by the app itself (on-device preferences). Libraries such
    // as AsyncStorage ship their own manifests for the APIs they use.
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
      ],
    },
  },
  android: {
    package: 'com.meyalo.app',
    adaptiveIcon: {
      backgroundColor: '#111312',
      foregroundImage: './assets/brand/app-icon/adaptive-icon-foreground.png',
      monochromeImage: './assets/brand/app-icon/monochrome-icon.png',
    },
    predictiveBackGestureEnabled: false,
    // Add to calendar opens the calendar app's own "new event" screen, which
    // needs no permission. expo-calendar's plugin adds these; remove them until
    // a feature reads or writes the calendar directly (conflict checks).
    blockedPermissions: [
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR',
    ],
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
        backgroundColor: '#FFFFFF',
        image: './assets/brand/mark/meyalo-mark-brand-512.png',
        imageWidth: 120,
        dark: {
          backgroundColor: '#111312',
          image: './assets/brand/mark/meyalo-mark-brand-bright-512.png',
        },
      },
    ],
    'expo-font',
    'expo-localization',
    // Welcome screen loop: muted, foreground only, no picture-in-picture.
    [
      'expo-video',
      { supportsBackgroundPlayback: false, supportsPictureInPicture: false },
    ],
    [
      'expo-calendar',
      {
        // iOS 17+: add events without being able to read the calendar.
        writeOnlyAccess: true,
        writeOnlyCalendarPermission:
          'Meyalo adds the events you choose to your calendar. It cannot read your calendar.',
      },
    ],
    // Local reminders only: no push, no background remote notifications.
    [
      'expo-notifications',
      {
        icon: './assets/brand/app-icon/monochrome-icon.png',
        color: '#1460D0',
      },
    ],
    googleMapsApiKey
      ? ['react-native-maps', { iosGoogleMapsApiKey: googleMapsApiKey }]
      : 'react-native-maps',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
