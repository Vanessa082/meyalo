# Deploying Meyalo

Meyalo has three parts to deploy, in this order: the **backend** (Supabase), the **website** (the Expo web export, which also serves event pages, plan links, legal pages and `/submit`), and the **apps** (Android and iOS). Every command below comes from the Expo and Supabase documentation for the versions this project uses (Expo SDK 57). Commands marked "you" need your accounts and are not run by contributors.

What you need first (details and costs in `docs/configuration.md`):
- A paid Supabase project in `eu-west-3` (Paris). The free plan pauses after a week without use.
- An Expo account (free for builds on the free tier; a custom web domain needs a paid plan).
- A domain, and an email provider (SMTP) with that domain verified. Email sign-in codes cannot launch without them.
- Google Play developer account, and Apple Developer Program membership for iOS.

## 1. Backend (Supabase)

### Link the project (you)

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <your-project-ref>
```

### Apply the migrations (you, carefully)

The hosted project is on an old schema. Look before changing anything:

```bash
pnpm dlx supabase migration list --linked
```

It shows which migrations the hosted project has recorded. Then preview what would run:

```bash
pnpm dlx supabase db push --linked --dry-run
```

Apply only 003 to 015, in order, and never `001`, `002` or `seed.sql` (see `docs/environment.md`, "Migrations on the remote project", for the checks before 006, 008 and 010, and the rule that 012 ships with the app release that sends consent). If the dry run lists 001 or 002, stop: they must be marked as already applied first (`pnpm dlx supabase migration repair --status applied <version>`), deliberately and one at a time. Take a backup before the real push.

```bash
pnpm dlx supabase db push --linked
```

### Deploy the functions and their secrets (you)

```bash
pnpm dlx supabase functions deploy delete-account
pnpm dlx supabase functions deploy translate-event
pnpm dlx supabase secrets set GOOGLE_TRANSLATE_API_KEY=...   # only if translation is on
```

### Dashboard settings (you)

| Where | Setting |
|---|---|
| Authentication, URL configuration | Site URL = your website address; add the web redirect URLs and `meyalo://` |
| Authentication, email | Custom SMTP with your domain; the "Magic link" and "Confirm signup" templates from `supabase/templates/sign-in-code.html` |
| Authentication, providers | Apple: client ID `com.meyalo.app` (native only, no key needed). Google: later |
| Authentication, sign-in | Anonymous sign-ins stay **off** |
| API settings | Remove `graphql_public` from the exposed schemas |
| Database, extensions | `pg_cron` on (migration 014 schedules the daily retention job) |
| Organisation | Multi-factor authentication required for members |

Create the first curator: create the user in Authentication, then in the SQL editor `insert into public.user_roles (user_id, role) values ('<user id>', 'admin');`.

## 2. Website (EAS Hosting)

The web build reads `EXPO_PUBLIC_*` values when it is exported, so set them first (you), once per environment:

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --environment production --visibility plaintext
npx eas-cli env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <publishable key> --environment production --visibility plaintext
npx eas-cli env:set --name EXPO_PUBLIC_APP_BASE_URL --value https://<name>.expo.app --environment production --visibility plaintext
npx eas-cli env:set --name EXPO_PUBLIC_PRIVACY_POLICY_URL --value https://<name>.expo.app/privacy --environment production --visibility plaintext
npx eas-cli env:set --name EXPO_PUBLIC_TERMS_URL --value https://<name>.expo.app/terms --environment production --visibility plaintext
npx eas-cli env:set --name EXPO_PUBLIC_CONTACT_WHATSAPP --value "+237 6XX XX XX XX" --environment production --visibility plaintext
```

Optional, each shown on the website only once set: `EXPO_PUBLIC_PLAY_STORE_URL` and `EXPO_PUBLIC_APP_STORE_URL` (after the apps are published) and `EXPO_PUBLIC_WHATSAPP_CHANNEL_URL` (after the Channel exists). The WhatsApp number is shown publicly; a separate WhatsApp Business number keeps a personal line private.

These values are public by design (they ship in the app); the database rules protect the data. Never put the service-role key or any provider key here.

Then build and publish:

```bash
npx eas-cli env:pull --environment production
pnpm build:web
npx eas-cli deploy --prod
```

`pnpm build:web` also writes each upcoming event's link preview page, the home page's "Coming up" list, the `/events` and `/events/<city>` pages, `sitemap.xml` and `robots.txt` (only when `EXPO_PUBLIC_APP_BASE_URL` is set), so **rebuild and deploy at least once a day**, for example with a scheduled CI job; new events otherwise share without a preview. Without `--prod`, `eas deploy` publishes a preview address you can check first. A custom domain needs a paid Expo plan and is set up in the EAS dashboard.

## 3. Apps (EAS Build and Submit)

`eas.json` has three profiles, each tied to the EAS environment of the same name: `development` (a development build you install on your own phone), `preview` (internal testing) and `production` (stores). Set the same `EXPO_PUBLIC_*` variables for each environment you use, as above.

### Try it on your own phone first

```bash
npx eas-cli build --profile development --platform android
```

When it finishes, open the link on the Android phone and install the build. Then start the bundler on your computer and open the app:

```bash
pnpm exec expo start --dev-client
```

Expo Go also works for most of the app, without any build (see the README).

### Store builds (you)

```bash
npx eas-cli build --profile production --platform android
npx eas-cli build --profile production --platform ios
```

Android produces an `.aab` for Google Play. Bump `version` in `app.config.ts` before each store build (`autoIncrement` is off).

### Submit (you)

```bash
npx eas-cli submit --platform android --latest
npx eas-cli submit --platform ios --latest
```

The first Android submission needs a Google Play service account key; the first iOS one an App Store Connect API key (EAS asks for both). For a new Android app, the first release goes to the internal testing track. Google Play requires a **closed test with at least 12 testers for 14 days** before production for new personal accounts: start it as early as possible.

## Release checklist

1. All checks pass (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm dlx supabase test db`, `pnpm test:rls`).
2. Tested on a real Android phone and a real iPhone.
3. Migrations applied to the hosted project in the right order, before the app release that needs them.
4. Website deployed with the production variables; `/privacy`, `/terms`, `/delete-account` open.
5. Store listings: privacy labels and data safety forms match the Privacy Policy; the account deletion URL is `<website>/delete-account`.
6. The open points in `docs/review-guide-2026-10-20.md` and the `[UNVERIFIED]` marks in `src/content/legal/` are resolved or accepted.

## The weekly WhatsApp post

In the console, **Weekly post** shows the next 7 days' published events as text, in French or English, with links. Copy it into the WhatsApp Channel (Channels have no API, so this stays manual). It needs `EXPO_PUBLIC_APP_BASE_URL` for the links.
