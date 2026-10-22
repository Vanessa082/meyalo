# Meyalo

Meyalo helps people in Cameroon find events that help them grow: trainings, workshops, conferences, scholarships, job and agri fairs, community and faith events with a growth purpose. Every event is checked by a curator before it is shown. The app works in French and English, on Android, iOS and the web, and keeps working offline.

Built with Expo SDK 57 (React Native, Expo Router), TypeScript and Supabase (Postgres with row level security, Auth, Storage, Edge Functions).

## Run it locally

You need:
- **Node.js** 20.19.4 or later (React Native's minimum; 24 is used day to day)
- **pnpm** 10 (`corepack enable` gives you the version in `package.json`)
- **Docker**, running, for the local Supabase stack
- For phones: the **Expo Go** app, or Android Studio / Xcode for a development build

```bash
git clone https://github.com/Vanessa082/meyalo.git
cd meyalo
pnpm install
```

### 1. Start the local backend

```bash
pnpm dlx supabase start
```

The first start downloads the images and applies every migration in `supabase/migrations/`, then `supabase/seed.sql`. It prints the local URLs and keys. Print them again at any time with `pnpm dlx supabase status`.

If it fails while downloading the logging images (no network), start without them:

```bash
pnpm dlx supabase start -x logflare,vector
```

### 2. Run the app in a browser

Point the app at the local backend for this terminal only:

```bash
eval "$(pnpm dlx supabase status -o env)"
EXPO_PUBLIC_SUPABASE_URL=$API_URL EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY pnpm web
```

Never point a development build at the hosted project.

### 3. Publish some events

A fresh database has only five draft events, and drafts are never shown in the app. To see events, publish them as a curator:

```bash
SUPABASE_URL=$API_URL SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY pnpm curator:local
```

This creates `curator@meyalo.local` with the password `local-dev-password` (or `LOCAL_ACCOUNT_PASSWORD` if set). Open `/console` in the browser, sign in, open a draft, record how you checked it against its source, and publish it. Do not add made-up events: use real, upcoming events from their official pages.

### 4. Run it on your phone (Expo Go)

Your phone and computer must be on the same Wi-Fi, and the local backend running. Then:

```bash
pnpm phone
```

It points the app at your computer's network address (a phone cannot reach `127.0.0.1`) and starts the bundler for Expo Go. If port 8081 is busy, pass another one: `pnpm phone 8082`. Scan the QR code with Expo Go (Android) or the Camera app (iPhone).

Expo Go runs almost everything. For Sign in with Apple and the release configuration of maps, use a development build:

```bash
pnpm exec expo run:android   # Android Studio, a device or an emulator
pnpm exec expo run:ios       # macOS with Xcode
```

### 5. Sign in locally

Sign-in uses a 6-digit email code. Locally, emails never leave your computer: read them in Mailpit at http://127.0.0.1:54324.

## Checks

Run these before opening a pull request. They must all pass.

```bash
pnpm typecheck
pnpm lint
pnpm test                      # unit tests, no backend needed
pnpm dlx supabase test db      # database rules (pgTAP), needs the local stack
```

With the local stack running, also:

```bash
eval "$(pnpm dlx supabase status -o env)"
SUPABASE_URL=$API_URL SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY pnpm test:rls
```

## How the code is organised

| Folder | What lives there |
|---|---|
| `src/app/` | Screens and routes (Expo Router). `(tabs)` is the main app, `(onboarding)` the first launch, `(auth)` sign-in, `console` the curator tool, `plan/[token]` the page friends open |
| `src/services/` | Logic without UI: ranking, sync, consent, repositories. Most are pure and tested with `node --test` |
| `src/components/` | Screen parts; `ui/` is the design system |
| `src/hooks/` | Data hooks (TanStack Query) |
| `src/lib/` | Platform adapters (`.native.ts` for phones, `.ts` for the web) |
| `src/i18n/messages/` | English and French text. Every visible string lives here |
| `supabase/migrations/` | The database, in order. Each one has tests in `supabase/tests/` |
| `supabase/functions/` | Edge Functions (`translate-event`, `delete-account`) |
| `docs/` | Decisions, configuration and research |

Start with `docs/product-decisions.md` (what Meyalo does and why), then `docs/architecture.md`.

## Ground rules for contributions

- **Write the test first** and see it fail, for logic and for every database rule.
- **The database enforces security.** Row level security and database functions decide who can read and write; the app only reflects it. A new table needs its policies and pgTAP tests in the same change.
- **Consent before anything personal reaches the server.** Use `ConsentBlock`. See `docs/consent-cameroon.md`.
- **No secrets in the app.** Only `EXPO_PUBLIC_*` values reach the app, and they are public. Server keys live in Supabase.
- **Every string in both languages.** Add it to `en.json` and `fr.json`.
- **No mock data in the app.** Tests use fixtures; the app shows only real, checked events.
- **Never develop against the hosted project**, and never run migrations on it yourself.

## Configuration and deployment

- Every variable and account the project needs: `docs/configuration.md`
- Local environment details: `docs/environment.md`
- Deploying the backend, the website and the apps: `docs/deploy.md`
