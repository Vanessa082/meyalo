# Environment configuration

Meyalo uses one package manager: **pnpm** (the install that produced `node_modules`). Do not commit `package-lock.json`.

```bash
pnpm install
pnpm start
```

## Variables

Only `EXPO_PUBLIC_*` variables are available in the app. Expo inlines them, so they are visible to anyone with the binary. They are not secrets.

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes, to load events | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes, to load events | Supabase anon key. Safe to ship because Row Level Security enforces access |
| `EXPO_PUBLIC_APP_BASE_URL` | No, until share links and event pages are used | Public https origin. No path. Changing it does not require code changes. iOS/Android app links read it at build time, so a new domain also needs a new native build |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Google Maps key for Android, and for Google Maps on iOS. Restrict it to `com.meyalo.app`. Without it, iOS uses Apple Maps |

Copy `.env.example` to `.env`. `.env` is gitignored and must stay untracked.

## Never put these in the client

- Supabase service-role key
- Google Cloud Translation or Gemini API keys
- Any database password

Those belong in server-side configuration (Edge Functions, EAS secrets for build-time public values only, or a host that is not the app).

## Where configuration is read

- App code: `src/config/env.ts` (`publicUrl()` builds links from `EXPO_PUBLIC_APP_BASE_URL` and returns null when it is unset)
- Native build: `app.config.ts` (map key, Apple Sign-In capability, universal links / app links host)

## Development build

Expo Go cannot include native Google sign-in, Sign in with Apple, or the maps native module configuration. The project is set up for a development build:

- `expo-dev-client` is installed and listed in `app.config.ts`
- `ios.usesAppleSignIn` is enabled so the Sign in with Apple capability is in the binary
- `eas.json` has a `development` profile (`developmentClient: true`)
- Google and Apple sign-in libraries are not installed yet. They are added when authentication is implemented, which requires another native build

Create a development build when you are ready to run it on a device or simulator:

```bash
pnpm exec expo run:android
pnpm exec expo run:ios
```

Or, with an Expo account:

```bash
pnpm exec eas build --profile development --platform android
```

Set the `EXPO_PUBLIC_*` variables in EAS for cloud builds. Do not commit them.
