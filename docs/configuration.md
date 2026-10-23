# What the owner configures

Every account, key, setting and file the app needs from you, by stack. Values
that ship in the app are `EXPO_PUBLIC_*` (public by design). Secrets live only
on servers (Supabase secrets, EAS secrets), never in the app or the repository.
How each is used is in `docs/environment.md`.

Status on 19 October 2026: `.env` has only the Supabase URL and key.

## 1. Needed today (development)

| Stack | What | Where it is read | Your action |
|---|---|---|---|
| Supabase | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `src/config/env.ts:19-20` (the app stops at launch without them) | Set. For local work, point them at the local stack (`supabase status`) |
| Supabase local | Docker and the Supabase CLI | `docs/environment.md` | `pnpm dlx supabase start`, then `migration up --local` |
| Supabase local | A local curator account | `scripts/create-local-curator.mjs` | Run it with the local service key; optional `LOCAL_ACCOUNT_PASSWORD` |
| Expo | A development build (maps, calendar, video and notifications are native; rebuild after adding expo-notifications) | `app.config.ts` | `pnpm exec expo run:android` / `run:ios`, or `eas build --profile development` with an Expo account |

## 2. Needed before launch

### Expo and EAS
| What | Your action |
|---|---|
| EAS project | Run `eas init`; it adds `extra.eas.projectId` to `app.config.ts` (none today) |
| Public variables in cloud builds | Create EAS environment variables for every `EXPO_PUBLIC_*` value per profile |
| Build numbers | `eas.json` has `autoIncrement: false` and no `buildNumber` / `versionCode`; bump by hand or enable auto increment |
| Store submission | `eas.json` has no `submit` section; add the App Store Connect app id and the Play service account |

### Apple
| What | Your action |
|---|---|
| Apple Developer Program | Enrol (yearly fee) |
| App ID `com.meyalo.app` | Register it and create the App Store Connect record |
| Sign in with Apple | Capability is already declared (`app.config.ts:39`); enable it on the App ID. Native iOS sign-in needs no key or Services ID: add `com.meyalo.app` to the Apple provider's client IDs in Supabase and enable the provider. Only `EMAIL` is requested. Test the nonce on a real iPhone before release |
| Universal links | When `EXPO_PUBLIC_APP_BASE_URL` is set, the build declares Associated Domains. Host `/.well-known/apple-app-site-association` on that domain. **The file does not exist yet** |
| App Privacy labels | Fill them in to match the privacy policy |
| Calendar permission text | Set in `app.config.ts` (write only). Review the wording |

### Google Play
| What | Your action |
|---|---|
| Developer account | Pay the one-time fee and verify identity |
| App `com.meyalo.app` | Create it; start the closed test early (12 testers for 14 days) |
| App Links | Host `/.well-known/assetlinks.json` with the Play signing SHA-256. **The file does not exist yet** |
| Data safety and account deletion URL | `<APP_BASE_URL>/delete-account` after its placeholders are filled |

### Supabase (hosted)
| What | Your action |
|---|---|
| Plan and region | Paid plan (free projects pause); region eu-west-3 (Paris) |
| Migrations | Apply 003 to 014 in order, `db push --dry-run` first (order and notes in `docs/environment.md`). Never 001, 002 or `seed.sql` |
| Exposed schemas | Remove `graphql_public` in API settings |
| First curator | Create the user, then insert `(user_id, 'admin')` into `user_roles` from the SQL editor (only an admin can grant admin) |
| Auth URLs | Site URL = `APP_BASE_URL`; add `meyalo://` and the web redirect URLs |
| SMTP | **Launch blocker for accounts.** Custom SMTP (an email provider account) and your own sender domain with SPF and DKIM records; `*.expo.app` cannot send email. Supabase's built-in sender allows only a few emails an hour. Then set the email template to `supabase/templates/sign-in-code.html` (Magic link and Confirm signup) |
| Account deletion | Deploy `delete-account` (`supabase functions deploy delete-account`); it uses the built-in service role, no extra secret |
| Retention job | Migration 014 schedules `meyalo-retention` with pg_cron (enable pg_cron in Database, Extensions, if the migration reports it missing) |
| Translation | `supabase secrets set GOOGLE_TRANSLATE_API_KEY=...`, deploy `translate-event`, then `EXPO_PUBLIC_TRANSLATION_ENABLED=true` |

### Web and domain
| Variable / item | Your action |
|---|---|
| `EXPO_PUBLIC_APP_BASE_URL` | Choose `https://<name>.expo.app` or a domain. A change needs a new native build. Required for invites from phones: without it, plans with friends can be shared only from the website |
| Hosting and daily rebuild | Choose the host; rebuild daily so link previews stay fresh |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_URL` | `<APP_BASE_URL>/privacy` and `/terms` |
| `EXPO_PUBLIC_CONTACT_WHATSAPP` | The public WhatsApp number for "Chat with us" and "Forward us an event" (international form). Shown on the website. A separate WhatsApp Business number keeps a personal line private |
| `EXPO_PUBLIC_PLAY_STORE_URL`, `EXPO_PUBLIC_APP_STORE_URL` | Store pages, once the apps are published. Until then the website says "Coming soon" |
| `EXPO_PUBLIC_WHATSAPP_CHANNEL_URL` | The Channel invite link, once the Channel exists |
| Legal placeholders | Operator name, legal form, registration number, address, contact email, response time, retention periods (`src/content/legal/*.ts`); lawyer review |

### Google Cloud
| Key | For | Your action |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | The Android map | Enable Maps SDK for Android; restrict to `com.meyalo.app` and the signing SHA-1. Note: iOS uses Apple Maps today even with a key |
| `GOOGLE_TRANSLATE_API_KEY` (server secret) | Translate | Enable Cloud Translation API; restrict the key to it; set a budget alert |

### Web map tiles
The web map uses OpenFreeMap (`src/config/map.ts`): free, no key, OpenStreetMap
attribution shown on the map. Nothing to set up. To use another provider, change
the two style URLs there.

### OpenStreetMap geocoding
The Nominatim usage policy asks requests to identify the app. Today they send
no contact or app name (`src/services/geocoder.service.ts:13`). Decide a contact
address; a small code change then adds it.

### Other
| What | Your action |
|---|---|
| WhatsApp Channel and Business inbox | Create them |
| Error monitoring | Choose a provider that collects no personal data, behind consent (see `docs/consent-cameroon.md`) |

## 3. Planned features
| Feature | You will need |
|---|---|
| Google sign-in | A Google Cloud project with an OAuth consent screen (app name, support email, Privacy Policy and Terms links, logo), three OAuth clients (web, used by Supabase, with its secret; iOS with the bundle id; Android with the package name and the Play signing SHA-1), all enabled in Supabase. Scopes: `openid` and `email` only. A native library is chosen and vetted first |
| Inactive account deletion (24 months, warning email) | The email provider above; then a scheduled job |
| Plans with friends | Anonymous sign-ins enabled; probably a captcha (Cloudflare Turnstile keys) |
| Flyer extraction | A Gemini API key as a server secret |
| Google geocoding | A Geocoding API key behind a server function |
| Feedback screenshots | A private storage bucket |
| Reminders and calendar conflict checks | No keys; permission texts in the build |
