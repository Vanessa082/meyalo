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
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Before store submission | https URL of the Privacy Policy. The welcome screen hides the link until it is set |
| `EXPO_PUBLIC_TERMS_URL` | Before store submission | https URL of the Terms. Hidden until set |
| `EXPO_PUBLIC_GEOCODER_URL` | No | Curator venue search. Unset: OpenStreetMap Nominatim ([usage policy](https://operations.osmfoundation.org/policies/nominatim/)). `off` disables it (the policy requires an off switch). Another https origin points at another Nominatim. To move to Google, add a `Geocoder` implementation behind a server proxy and select it in `src/services/geocoder.service.ts` |

Copy `.env.example` to `.env`. `.env` is gitignored and must stay untracked.

## Legal and store pages

The app ships these static routes, which `web.output: 'static'` exports as plain HTML pages. They follow the app language (FR/EN) and are marked as drafts pending review by a lawyer qualified in Cameroon. Content lives in `src/content/legal/`.

| Route | Used for |
|---|---|
| `/privacy` | Privacy Policy. Set `EXPO_PUBLIC_PRIVACY_POLICY_URL` to `<APP_BASE_URL>/privacy`; also the App Store Connect privacy policy URL |
| `/terms` | Terms of Use. Set `EXPO_PUBLIC_TERMS_URL` to `<APP_BASE_URL>/terms` |
| `/delete-account` | Google Play account deletion URL (`<APP_BASE_URL>/delete-account`) |
| `/how-we-verify` | Public explanation of verification levels and red flags |

When the substance of any legal page changes, update `LEGAL_LAST_UPDATED` in `src/content/legal/common.ts`.

## Web build and link previews

```bash
pnpm build:web
```

This runs `scripts/build-event-previews.mjs`, then `expo export --platform web` into `dist/`.

- The script reads upcoming published events with the public key (through `events_public`) and writes `src/generated/event-previews.json` (gitignored; `postinstall` creates an empty one).
- Each event in that file gets its own static page, `dist/event/<id>.html`, with Open Graph and Twitter tags. That is what WhatsApp, Facebook and search engines read for the link preview.
- The preview image is `public/og-default.png` (1200 by 630), copied to the site root.
- Set `EXPO_PUBLIC_APP_BASE_URL` for the build. Without it the tags carry no URL or image, and WhatsApp shows a plain link.
- Previews reflect the events at build time. Events published later still open in the app and on the web, but share without a preview until the next build. Rebuild and deploy at least daily (for example a scheduled CI job).
- SDK 57 static pages cannot load data while rendering, which is why the previews are built beforehand. On SDK 58, `generateMetadata` can replace this.
- If Supabase is configured but unreachable, the build fails instead of shipping pages without previews.
- The export runs with `--clear`: Expo writes `EXPO_PUBLIC_*` values into the code when it transforms each file, and a cached transform from a build with other values would ship the wrong site address.

## Never put these in the client

- Supabase service-role key
- Google Cloud Translation or Gemini API keys
- Any database password

Those belong in server-side configuration (Edge Functions, EAS secrets for build-time public values only, or a host that is not the app).

## Where configuration is read

- App code: `src/config/env.ts` (`publicUrl()` builds links from `EXPO_PUBLIC_APP_BASE_URL` and returns null when it is unset)
- Native build: `app.config.ts` (map key, Apple Sign-In capability, universal links / app links host, export-compliance flag `ios.config.usesNonExemptEncryption`, iOS privacy manifest `ios.privacyManifests`)

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

## Curation console (local)

The console lives at `/console`. It signs in with email and password and only shows events to accounts with the curator role (`user_roles.role = 'admin'`). The database enforces every permission; the console only reflects it.

Run it against the local Supabase stack, never the remote project. `.env` points at the remote project, so override the two public variables on the command line:

```bash
pnpm dlx supabase start
eval "$(pnpm dlx supabase status -o env)"
SUPABASE_URL=$API_URL SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY pnpm curator:local
EXPO_PUBLIC_SUPABASE_URL=$API_URL EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY pnpm web
```

`pnpm curator:local` creates `curator@meyalo.local` (curator) and `member@meyalo.local` (no role) with password `LOCAL_ACCOUNT_PASSWORD`, or `local-dev-password` when unset. It refuses non-local URLs. These are development accounts, not seed data.

## Tests

| Command | Needs | Covers |
|---|---|---|
| `pnpm test` | Nothing | Validation, event rules, use cases, mapping, repository input checks |
| `pnpm test:db` | Local stack, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Repository against the database as curator, signed-in non-curator and anonymous. Refuses non-local URLs and removes its fixtures |
| `pnpm test:rls` | Same as above | Row Level Security boundaries |
| `pnpm dlx supabase test db` | Local stack | pgTAP tests in `supabase/tests/`: what anon and non-curators can read and write, the `events_public` view and the event columns hidden from anon, length limits, report rate limit |

### pgTAP tests

`supabase test db` runs every `*.test.sql` file in `supabase/tests/` against the local database. Each file runs in a transaction and rolls back, so it leaves no data behind. Write a new test before the migration that makes it pass, and see it fail first.

```bash
pnpm dlx supabase migration up --local
pnpm dlx supabase test db
```

`pnpm dlx supabase db reset` also works, but it wipes local data, including the accounts created by `pnpm curator:local`.

## Migrations on the remote project

The remote project is on the old schema. Migrations are applied there only when the owner decides, in order: `003_domain_model.sql`, `004_row_level_security.sql`, `005_curation.sql`, `006_hardening.sql`, `007_verification.sql`, `008_public_columns.sql`, `009_supply.sql`, `010_search.sql` (it makes `events.created_at` required and stops if an old row has none; set those rows first, deliberately), then `011_event_images.sql` (image columns and the public `event-images` storage bucket with curator-only writes), then `012_consent.sql` (consent columns on reports and submissions, and `submit_event` with seven arguments). Apply 012 together with the app release that sends consent: from then on the database refuses reports and suggestions from older app versions, which do not send it. Then `013_accounts.sql` (account consents, profile and plan sync with `sync_account`, deletion records; it also stops curators from reading or writing people's plans and profiles) and `014_retention.sql` (enables pg_cron and schedules the daily `meyalo-retention` job). Deploy the `delete-account` function with them. Never run `001`, `002` or `seed.sql` against the remote project, and never reset it.

`008_public_columns.sql` removes anon access to `events.checked_by` and `events.source_submission_id`, and anon can no longer select every column of `events`. Any app build that still reads `events` directly as a guest gets a permission error, so apply it only after every build in use reads published events through `events_public`.

Before `006_hardening.sql`, check that no existing row breaks its length limits (`reports.note` 500, `feedback.message` 2000, `feedback.reply_email` 254, `submissions.note` 1000, `submissions.raw_text` 5000 characters). The migration fails if one does. `supabase/config.toml` only configures the local stack: the exposed schemas on the remote project are set in the dashboard (API settings), where `graphql_public` must be removed separately.

## Accounts on the local stack

- Sign-in codes arrive in Mailpit at http://127.0.0.1:54324 (`supabase/templates/sign-in-code.html`). The local stack is not limited to a few emails an hour; a hosted project with custom SMTP is.
- New Edge Functions are picked up by `pnpm dlx supabase functions serve` (all functions on the usual URL); the runtime started by `supabase start` lists only the functions it found at start.
- If `supabase start` fails while downloading the logging images (no network), `pnpm dlx supabase start -x logflare,vector` starts everything else.
- Sign in with Apple stays disabled locally (`[auth.external.apple]`); it needs a real iPhone and an Apple Developer account.

## Translation (translate-event Edge Function)

Event pages can machine translate an event's title and description
(docs/product-decisions.md, Feature 6 spec). The app sends only the event id
and the target language; the function reads the published text itself, calls
Google Cloud Translation, and caches the result in `public.event_translations`
(migration 003). The provider key lives only on the server.

| Setting | Where | Value |
|---|---|---|
| `GOOGLE_TRANSLATE_API_KEY` | Local: `supabase/functions/.env` (gitignored). Hosted: `supabase secrets set GOOGLE_TRANSLATE_API_KEY=...` | A Google Cloud API key restricted to the Cloud Translation API |
| `EXPO_PUBLIC_TRANSLATION_ENABLED` | `.env` and EAS environment | `true` once the key is set; unset hides the action |

Run it locally:

```bash
pnpm dlx supabase functions serve translate-event
```

Deploy it to the hosted project when you decide:

```bash
pnpm dlx supabase functions deploy translate-event
```

Without the key the function answers `503 not_configured` (cached translations
still work). It needs no JWT (`verify_jwt = false` in `supabase/config.toml`)
because the publishable key is not a JWT; it accepts nothing but an event id
and `en` or `fr`, and only translates published, confirmed events.

## Add to calendar

`expo-calendar` is a native module, so it needs a new development build.
iOS asks for write-only calendar access (iOS 17+) on the first tap. Android
opens the calendar app's own "new event" screen and needs no permission; the
calendar permissions the plugin would add are removed with
`android.blockedPermissions` in `app.config.ts`. The web downloads an `.ics`
file.
