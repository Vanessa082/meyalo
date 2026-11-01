# Changes, 18 to 19 October 2026

What was built after the audit of the app, phase by phase: what changed, why,
where it lives, and how it was checked. Nothing here is committed yet; all of it
is on the `phase-1-2-foundation` branch as working-tree changes.

The plan these phases follow is the one agreed after the audit (audit, then
Phases 1 to 10). Product rules live in `docs/product-decisions.md`; how each
technology is wired and replaced is in `docs/architecture.md`.

> **Note on scope.** The branch already had uncommitted work before this
> session (onboarding, theme tokens, discovery profile, i18n). This document
> covers what was added on top of it. A review before committing should look
> at both.

## Where things stand

| Check | Result |
|---|---|
| `pnpm typecheck` | Passes |
| `pnpm lint` | Passes (204 files) |
| `pnpm test` | 295 of 295 pass |
| `pnpm test:db`, `pnpm test:rls` (local stack) | Pass |
| `pnpm dlx supabase test db` (pgTAP, local) | 6 suites pass |
| `pnpm build:web` | Builds; event pages carry link previews |
| Browser walkthrough | Phone size, light and dark, every flow below |
| Native app on a device | Not checked: needs a development build |

Database migrations 006 to 009 are applied to the **local** stack only. The
remote project has not been touched.

## How to run what was built

```bash
pnpm install
pnpm dlx supabase start
pnpm dlx supabase migration up --local
pnpm test
pnpm dlx supabase test db
pnpm build:web
```

`docs/environment.md` has the variables, the local curator account and the
remote migration order.

---

## Audit

The audit ran the app on the web against local Supabase, read the code and the
product decisions, and researched the market and deployment. It found the app
was showing information that was not true: an in-person Yaoundé event shown to
a Buea user, a map with invented pins and counts, a month title fixed to
September, and a Report button that said "our team will review it" but sent
nothing. Those findings set the order of the work below.

## Phase 1: stop showing false information

| Change | Why | Where |
|---|---|---|
| Ranking uses the real topic and goal ids, with hard rules: past, cancelled and excluded formats never show, and in-person events from another city never enter the main list | The old ranking matched words in the category and only gave the user's city a bonus | `services/ranking.service.ts`, `config/discovery/goals.ts` (goal to offer map) |
| For You shows sections: top picks with reasons, more upcoming, and "Beyond your city: matches your interests", sorted by distance | Your decision: other cities appear, but labelled and apart | `app/(tabs)/index.tsx` |
| Around You lists in-person events by real straight-line distance from the city centre, with 2, 5, 10 km and whole-city filters, and a "Location not pinned" group | The old screen showed a fake map | `services/around-you.ts`, `services/geo.ts`, city centres in `config/discovery/cities.ts` |
| My Month title comes from today's date in the app language | It was hard-coded to September 2026 | `i18n/format.ts` |
| Report a problem works: reason chips, optional note, saved to the database, success shown only after it is stored | It used to show a promise and send nothing | `components/event/report-sheet.tsx`, `EventRepository.report` |
| A toast system replaces alerts | Alerts do nothing on the web and block the screen | `components/ui/toast.tsx` |
| Saving fails visibly | A failed save used to report success | `services/saved-events-store.ts` |
| Event page: a network error no longer says "Event not found"; a failed link open shows an error | Both were misleading | `app/(tabs)/event/[id].tsx` |
| Screens translated, duplicate headers removed, the storage key and the inaccurate "no tracking" line removed from You | Copy must be accurate and bilingual | `i18n/messages/*.json` |

Checked by: a regression test that failed on the old ranking first, unit tests
for distance and dates, and a report sent in the browser and found in the
database.

## Phase 2: rebrand (learning.md inspired)

| Change | Where |
|---|---|
| Palette: off-white canvas, neutral ink, forest green for links and accents on light, lime as the single action colour. Dark theme is neutral near-black with lime accents | `theme/colors.ts` |
| Every text and background pair is checked for contrast in both themes (47 pairs) | `theme/contrast.test.ts` |
| Manrope replaces Inter, with ExtraBold headlines | `theme/typography.ts`, `app/_layout.tsx` |
| Pill buttons; selected chips, segments and filters are a lime pill with ink text everywhere | `theme/radius.ts`, `components/ui/chip.tsx`, `segmented-control.tsx`, `category-filter-bar.tsx` |
| Logo, icon, favicon, avatar and splash recoloured; app icon is a lime mark on ink. The logo in the app is drawn from vector paths in theme colours | `assets/brand`, `components/ui/brand-logo.tsx`, `brand-paths.ts` |
| Tab icons are one line icon family (house for For You) | `app/(tabs)/_layout.tsx` |
| Static web pages now contain real HTML instead of an empty shell | `app/_layout.tsx` |

Decisions from you along the way: full rebrand, no forest-green backgrounds,
a neutral dark theme, no star icon, a crisp logo. `BRAND.md` records the rules.

## Phase 3: offline first

| Change | Where |
|---|---|
| Public event data is kept on the phone for 7 days; curator data and the profile never are | `lib/persistence-policy.ts`, `lib/query-client.ts` |
| Screens say when you are offline and how old the data is | `components/ui/offline-notice.tsx` |
| Event pages open offline from the cached list or a saved copy | `hooks/use-events.ts` |
| Saved events keep a copy of the event, so My Month works offline and after an event leaves the feed. Old saves migrate without loss | `services/saved-events-store.ts` |
| Reports made offline wait in an outbox, survive a restart and send on reconnect; a resend can never create a duplicate | `lib/query-client.ts`, `client_request_id` in 006 |

Checked by: simulating a connection loss in the browser, queuing a report, and
seeing it arrive in the database after reconnecting.

## Map and venue locations

| Change | Where |
|---|---|
| The fake map is gone. Around You has a List and Map switch on phones, showing real pins only | `components/ui/event-map.native.tsx` |
| Curators find a venue's coordinates with a "Find" search (OpenStreetMap, within its usage policy) | `components/console/venue-search.tsx`, `services/geocoding.ts` |
| The console lists published in-person events that are not on the map | `app/console/index.tsx` |
| The geocoder is an interface, so Google can replace OpenStreetMap later | `services/geocoder.service.ts` |

Checked by: a real venue search filling coordinates in the console, and the
Android bundle building. The map itself has not been seen on a device.

## Phase 4: database hardening (separate session, merged here)

Migration `006_hardening.sql` with pgTAP tests: a public view of events
without curator fields, organizers public only with a public event, reports
only on published events, server-generated submission tokens, length limits,
a report rate limit, GraphQL no longer exposed. Migration
`008_public_columns.sql` then made the app read events through that view and
removed anonymous access to curator columns.

## Phase 5: verification model (anti scam)

| Rule | Enforced in |
|---|---|
| Every check is recorded with method, evidence link, red flags, fee answer, notes, who and when; curators only, never edited | `event_checks` table, `007_verification.sql` |
| Verification changes only through `record_check`; a check date always has evidence behind it | database guard |
| A check with a red flag cannot confirm; organizer confirmation needs contact with the organizer | constraints |
| Fee-charging opportunities need two different curators | `record_check` |
| Two scam reports in 24 hours take an event down for review, except organizer-confirmed and partner events | trigger |
| Event pages say "Meyalo never asks you to pay to apply" | `app/(tabs)/event/[id].tsx` |

The console has a "Record a check" form, a check and report history per event,
and a "Taken down for review" view. Your choices: auto-hide only for trusted
exceptions, freshness flagged but never hidden, second curator for fees.

## Phase 6: supply beyond tech

| Change | Where |
|---|---|
| Public "Suggest an event" page, no account, with a private status link | `app/(tabs)/submit`, `009_supply.sql` |
| Curators decide suggestions in the console; the submitter sees the outcome and reason | `app/console/submissions.tsx` |
| Coverage grid: upcoming events per city and topic, zeros highlighted | `app/console/coverage.tsx` |
| Sport and wellbeing is a topic; the growth rule is shown to submitters and curators | `config/discovery/topics.ts`, `components/console/event-form.tsx` |
| A sources list for curators | `docs/event-sources.md` |
| Anonymous suggestions are capped at 60 per hour | `009_supply.sql` |

## Phase 7: WhatsApp sharing and link previews

| Change | Where |
|---|---|
| "Share on WhatsApp" is the main share action; it opens a new tab on the web | `services/share.ts`, event page |
| Each event page carries Open Graph tags, built at deploy time, so a shared link shows a preview card | `scripts/build-event-previews.mjs`, `services/event-preview.ts` |
| Default preview image rendered from the logo vectors | `public/og-default.png` |
| `pnpm build:web` regenerates previews and exports with a clean cache | `package.json` |

## Phase 8: legal pages and store settings (separate session)

Privacy, Terms, Delete account and How we verify pages in French and English,
marked as drafts for a Cameroonian lawyer, plus the iOS export compliance and
privacy manifest settings in `app.config.ts`.

Updated 2026-10-19 for optional accounts (written without a lawyer), following
"Spec: accounts" in `docs/product-decisions.md`:

| Change | Where |
|---|---|
| Privacy Policy: optional accounts (email code, Apple, Google later), what syncs and what never leaves the phone, the retention table, the deletion record, signed-in reports and suggestions linked until deletion, consent as the only basis (no "legitimate interest"), the age question and guardian box, Supabase in France and Google translation named | `content/legal/privacy.ts` |
| Delete account page: steps in the app and on the web, what is deleted at once, what is kept and for how long, inactive accounts, guests, curator accounts removed by an admin | `content/legal/delete-account.ts` |

Still marked `[UNVERIFIED: ...]` in the text: the 3-year limitation period,
Law 2010/012 art. 46, the legal basis wording (Law 2024/017 art. 9 and 50),
valid parental consent, the transfer authorisation, the launch email
provider, and how long host backups keep deleted data. Placeholders left for
the owner: controller identity, contact email, response time, feedback and
curator retention, technical logs, web hosting location, provider links.

Two points to settle: the texts say reports are kept 12 months after they
were sent (as the retention step of the plan says), while the accounts spec
says 12 months after a curator closes them. The inactive-account warning email
is promised in the text but needs an email provider before launch.
`LEGAL_LAST_UPDATED` in `content/legal/common.ts` still says 18 October.

## Layout, spacing and reusable components

| Change | Where |
|---|---|
| One page layout for every screen: gutter, centred width, padding, one gap between sections, optional full-width image | `components/ui/page.tsx` |
| Spacing between siblings comes from the parent (`Stack`), never from child margins | `components/ui/stack.tsx` |
| Shared pieces instead of copies: page header, section header, icon circle, preference row | `components/ui/` |
| The same app header (back, logo, language, profile) and tab bar on every app screen; back returns where you came from | `components/ui/app-header.tsx`, `app/(tabs)/_layout.tsx` |
| Text below 12px removed; touch targets at least 44 | throughout |

Onboarding and the curator console keep their own layouts on purpose.

## French and English everywhere (separate session)

Event dates, date badges, prices, trust labels, verification text and link
labels are now formatted in the app language when the screen renders, using
the event's own timezone. The English-only month and weekday lists are gone
from `services/event-mapping.ts`.

## Phase 9, part 1: quick chips and "Not interested"

Spec: `docs/product-decisions.md`, Feature 5, "Spec: quick chips and Not interested".

| Change | Where |
|---|---|
| Quick chips on For You: This weekend (in the event's timezone), Free, Online, Registration closing soon (deadline within 7 days). Chips combine; an empty result says so and offers Clear filters | `services/quick-filters.ts`, `components/for-you/quick-filter-bar.tsx` |
| Event cards carry the registration deadline | `types/event.type.ts`, `services/event-mapping.ts` |
| "Not interested" on For You cards. The card turns into a panel in place with Undo and four optional reasons; the feed does not reorder while you are on the screen | `components/ui/event-card.tsx`, `components/for-you/hidden-event-panel.tsx`, `hooks/use-value-at-focus.ts` |
| Hidden events are stored on the phone with a small copy, fail visibly on read or write errors, and never show in For You. Explore still finds them | `services/hidden-events-store.ts`, `hooks/use-hidden-events.ts` |
| Learned affinity (15 points): saves raise topics and organisers; reasons lower topics and organiser, a city, a part of the week, or paid events. It only reorders matches | `services/affinity.ts`, `services/ranking.service.ts` |
| You → Hidden events, with Show again | `app/(tabs)/hidden-events.tsx`, `app/(tabs)/you.tsx` |
| Event card icons now have 44px touch areas | `components/ui/event-card.tsx` |

Checked by: tests seen failing first (quick filters, store, affinity, ranking),
then in the browser at phone size: chips, the empty filter message, hiding,
a reason saved, Undo, the Hidden list and Show again. The success toast is in
the page but was not seen on screen, because the window was not visible.

## Phase 9, part 2: skeleton, calendar, directions, translate

Spec: `docs/product-decisions.md`, Feature 6, "Spec: Add to calendar, Directions, Translate".

| Change | Where |
|---|---|
| For You shows placeholder cards while loading | `components/ui/event-card-skeleton.tsx` |
| Add to calendar: iOS system form (write-only permission on first tap), Android calendar app screen (no permission; the plugin's calendar permissions are blocked), web `.ics` download. No end time means 2 hours, said in the notes | `services/calendar-entry.ts`, `lib/device-calendar*.ts`, `app.config.ts` |
| Directions for in-person and hybrid events with coordinates or a street address; Apple Maps, `geo:` on Android, Google Maps on the web | `services/directions.ts` |
| Translate: the app sends only an event id and a language; the `translate-event` function reads the published text, calls Google Cloud Translation and caches per field and text hash in the existing `event_translations` table. Hidden until `EXPO_PUBLIC_TRANSLATION_ENABLED=true` | `supabase/functions/translate-event`, `EventRepository.translate`, `hooks/use-events.ts` |
| New dependency: `expo-calendar` (Expo first-party, SDK-matched) | `package.json` |
| Owner checklist and consent research | `docs/configuration.md`, `docs/consent-cameroon.md` |

Checked by: tests seen failing first (calendar entry and `.ics`, directions,
translate function logic); the function served locally and called for every
path (bad input, unknown event, no provider key, cached hit, CORS); in the
browser, the `.ics` file content, the unavailable message, and a cached
translation with Show original. Not checked: the native calendar screens and
maps apps (need a development build), a real Google translation (needs a key),
and Directions in the browser (the local event has no address).

A first draft added a new translations table; the pgTAP run showed one already
existed (003), so the draft was removed and its local grant changes reverted.

## Phase 9, part 3: Explore server search

Spec: `docs/product-decisions.md`, Feature 7, "Spec: server search with filters in the address".

| Change | Where |
|---|---|
| One database function holds every search rule: accent and case insensitive words across title, description, organiser, venue and city; topic names in both languages; city, format, free, topic, offer, language, open registration and date filters; past events never | `010_search.sql` (`search_public_events`, `search_text`) |
| Paged 20 at a time with "Load more" and a real total; soonest or recently added | `EventRepository.searchPublished`, shared keyset paging |
| Search and filters live in validated page-address parameters, so any view can be shared and restored; quick taps never undo each other | `services/explore-params.ts`, `app/(tabs)/explore.tsx` |
| Filters: date, launch cities, format and free always visible; topic, offer, language, open registration and sort under "More filters"; topic shortcuts when nothing is chosen | `components/explore/explore-filters.tsx` |
| The old keyword "categories" bar is removed | `components/ui/category-filter-bar.tsx` (deleted) |

Checked by: 17 pgTAP checks, 5 database tests through the repository, 16 unit
tests for the address parameters, and in the browser: an accent-free deep link,
city and free chips, online and free, a French topic name, the empty state,
Clear all, and two quick taps. Six local events inserted straight into the
database for that walkthrough were deleted afterwards at your request: events
only enter through suggestions or the curator console, then a check and
publishing.

## Fixes: theme flash on the web, hybrid events from other cities

| Change | Why | Where |
|---|---|---|
| On the web, colours are CSS variables, with both palettes in the page head under `prefers-color-scheme` | Static pages were rendered light and switched to dark after loading, so a refresh flashed the wrong theme. Now the first paint is already right, with or without JavaScript | `theme/css-vars.ts`, `hooks/use-theme.web.ts`, `app/+html.tsx`, navigation theme in `app/_layout.tsx` |
| Hybrid events held in another city go to "Beyond <city>", not the main list, unless the person only attends online | A Douala profile was shown Buea events in its main list | `services/ranking.service.ts` |

Checked by: static pages loaded with scripts blocked, in dark and light (backgrounds,
text and surfaces in the right palette before any script); icons resolving their
colour variables; ranking tests seen failing first. Native apps are unchanged
(they never had the flash). Card and toast shadows still follow the scheme after
loading, a small difference in shadow only.

## Explore price filter, real events, and the UI pass

| Change | Where |
|---|---|
| Explore price filter: Free and Paid (paid or varying); "price not stated" matches neither | `explore-params.ts`, `010_search.sql`, `explore-filters.tsx` |
| Posters for every event in topic colours, contrast-tested; the event image replaces it when there is one | `theme/posters.ts`, `components/event/event-poster.tsx` |
| For You: carousel, closing-soon rail, topic rails, list; each event once | `services/for-you-rails.ts`, `app/(tabs)/index.tsx` |
| Event page: poster hero, mini map, price row, sticky Save and Register | `app/(tabs)/event/[id].tsx`, `Page` footer slot |
| Motion: press scale, entrance (transform and opacity only), save pop, splash fade | `components/ui/motion.tsx`, `app/_layout.tsx` |
| Web map with MapLibre and OpenFreeMap tiles, loaded only when shown | `components/ui/event-map.tsx`, `config/map.ts`; dependency `maplibre-gl` 6.12.0, pinned |
| A note on For You when a format preference hides events | `app/(tabs)/index.tsx` |
| 11 real events published locally through the curator service (create, record a check with its official source, publish); 2 paid ones wait for a second curator; 3 left out (compromised source, or no start time) | local database only |

Checked by: tests seen failing first (price filter, posters, layout, zoom), pgTAP,
and in the browser at phone size with the real events. One bug found and fixed
on the way: Reanimated's layout entrance positions items absolutely on the web,
which stacked the carousel; the entrance now animates opacity and transform only.
Not checked: the native map, splash and motion on a phone (needs a development build).

## Colour, verified seal and welcome video

| Change | Where |
|---|---|
| Black, white and one green: lime removed; neutral greys and a white light background; bright green for dark | `theme/colors.ts`, `theme/posters.ts`, contrast tests |
| App icon, splash, favicons and the mark regenerated; the asset script now uses cairosvg and Pillow instead of ImageMagick | `scripts/generate-assets.py`, `assets/brand` |
| Verified seal (filled scalloped badge with a check) on cards and the event page | `components/ui/verified-badge.tsx` |
| Welcome loop prototype: 22 KB WebM, 54 KB MP4, 7 KB still; gated and loaded after the page | `components/onboarding/welcome-backdrop*.tsx`, `services/decorative-video.ts`, `public/media`, `scripts/generate-welcome-loop.py` |

Checked by: contrast and poster tests, the video gate tests, and the welcome,
For You and event pages at phone size in light and dark.

## Final colour (blue), clean cards, real welcome video

| Change | Where |
|---|---|
| Brand colour is blue; palette names are hue-free (`Palette.brand*`) so a future change is one edit | `theme/colors.ts`, contrast tests |
| Masters recoloured and renamed (`meyalo-mark-brand*`, `meyalo-horizontal-brand-ink`, `meyalo-wordmark-brand`); every PNG regenerated | `assets/brand`, `scripts/generate-assets.py`, `scripts/verify-brand.js`, `app.config.ts` |
| Cards without a photo: white card, big blue date, black title, one outline bookmark; "Not interested" moved to long press and a screen-reader action. Topic colour palette and decorative icons removed | `components/event/event-poster.tsx`, `poster-card.tsx`, `components/ui/event-card.tsx`; `theme/posters.ts` and `topic-icons.ts` deleted |
| Verified seal tiers: blue (organiser) and grey (official source) | `components/ui/verified-badge.tsx` |
| Welcome video: a real speaker (Pexels, approved), 107 KB WebM / 121 KB MP4; the animated-loop generator was removed | `public/media`, `BRAND.md` (source and licence) |

Checked by: contrast tests, the brand asset check, a config check that every
asset path exists, unit tests, and the welcome and For You screens at phone
size.

## Event images, card layout, welcome video background

| Change | Where |
|---|---|
| Curators add an event image in the web console: the right to use it and alt text are required; the browser resizes to 640 and 1600 px WebP; a fresh file name per upload; replacing or removing deletes the old files | `011_event_images.sql`, `services/cover-image.ts`, `EventRepository.setCoverImage` / `removeCoverImage`, `components/console/cover-image-form.web.tsx`, `lib/resize-image.web.ts` |
| The public sees the image, its alt text and credit, never the rights answer; cards load the small file, the event page the large one | `events_public`, `rowToEvent`, `event-poster.tsx`, event page |
| Cards: the date is one small line; titles start at the same height; details at the bottom | `event-poster.tsx` |
| The personalise banner keeps the full width for its text on any screen | `components/ui/personalize-banner.tsx` |
| The welcome video fills the screen behind the text, forced dark so it reads in either theme (`ForceDark`: a `data-theme` attribute on the web, a context on phones); it now also plays on 3G (110 KB) | `app/(onboarding)/welcome.tsx`, `components/ui/force-dark*.tsx`, `theme/css-vars.ts`, `services/decorative-video.ts` |

Checked by: 12 pgTAP checks, 3 database tests with real uploads to local
storage, unit tests, and in the browser: the console refusing an image without
rights, a real upload and resize (2400 px JPEG to two WebP files), the public
event page showing the large file with its alt text, and removal deleting the
files. The test image was removed. Not checked: video playback on phones (they
show the still; playing needs expo-video).

## Welcome video on phones

| Change | Where |
|---|---|
| Phones play the welcome loop with `expo-video` (SDK-matched 57.0.5): bundled MP4 (124 KB), muted, mixes with other audio, fades in over the still once playing, stops for Reduce Motion (read live) | `components/onboarding/welcome-backdrop.tsx`, `hooks/use-reduce-motion.ts`, `app.config.ts` plugin (no background playback, no picture-in-picture) |

Checked by: typecheck, lint, unit tests, Expo loading the plugin, and the
Android and iOS bundles building with the clip included. Not checked: playback
on a real phone (needs a new development build), and the app size added by the
native player (measure with the store size reports or APK Analyzer).

## My Month and plan states

Spec: `docs/product-decisions.md`, "Spec: My Month and plan states".

| Change | Where |
|---|---|
| Plans are Saved or Going, with "I've registered"; earlier saves read as Saved with nothing lost; the bookmark never downgrades Going | `services/saved-events-store.ts`, `hooks/use-saved-events.ts` |
| "I'm going" on the event page, beside Save | `app/(tabs)/event/[id].tsx` |
| My Month: month calendar (Monday first, dots on planned days, arrows, tap a day to narrow), agenda by day with Going events, registration deadlines, clash and other-city warnings, free days of the coming weekend with their matches, Cancelled and Changed badges, Considering, collapsed Past | `services/month-plan.ts`, `components/month/month-calendar.tsx`, `app/(tabs)/month.tsx`, `i18n/format.ts` |
| Tab labels fit a 320 px screen: "Nearby" / "Autour" for Around You, no tab side padding | `app/(tabs)/_layout.tsx`, i18n |

Checked by: tests seen failing first (plan states, month plan, day headings), and
in the browser at phone size with real events: two Going DevFests on 28 November
in different cities flagged as clashing, Safinum under Considering, the
registered tick stored. Not built: reading busy times from the phone calendar,
swiping between months.

## Smarter For You: the eight behaviours and persona tests

Spec: `docs/product-decisions.md`, "What intelligent means for For You" and "How each is built".

| Behaviour | Where |
|---|---|
| Learn my habits: saves 1, Going 1.5, opens 0.5, "Not my topic" -1, fading by half every 60 days | `services/affinity.ts`, `services/opened-events-store.ts` (opens on the phone, 200 most recent, one per visit) |
| Catch deadlines: +12 and "Registration closes soon" first, for matches closing within 7 days | `services/ranking.service.ts` |
| Explain every pick: every top pick has a reason; reasons ranked so the most telling survive the limit of three; "Like events you saved" | `services/ranking.service.ts`, For You |
| Mix, not repeat: at most two top picks per topic, one per organiser | `services/ranking.service.ts` |
| Respect my time: weekday or weekend and part of day of saved, Going and opened events lift the same slot | `services/affinity.ts` |
| Fresh and trusted: +3 checked within 14 days, -3 unchecked for 45 | `services/ranking.service.ts` |
| Good with no history, Measured by a test: five personas plus rules every feed must follow | `services/ranking.personas.test.ts`, `test-support/persona-events.ts` |
| "Learn from my activity" switch in You: off means only "Not interested" answers count, and the opens history is deleted | `services/learning-setting.ts`, `hooks/use-learning.ts`, `app/(tabs)/you.tsx` |
| Privacy page lists plans, hidden events and opened events kept on the phone | `content/legal/privacy.ts` |

What the persona tests found: a matching grant session closing in two days now
outranks a nearer finance evening for a finance-minded user (the deadline rule
working as chosen), and a real bug, the habit reason being cut by the limit of
three reasons, fixed with a reason priority.

Checked by: 358 unit tests including the personas, and in the browser: an open
recorded, the switch turning learning off, deleting the history and stopping new
records.

## Replaceable technology

No screen or component imports a vendor library. Storage, the data layer,
Supabase, maps, geocoding and the launch region are each chosen in one file.
`docs/architecture.md` maps them.

## Database migrations added

| File | Purpose |
|---|---|
| `006_hardening.sql` | Public view, narrower anonymous access, limits, report rate limit |
| `007_verification.sql` | Evidence trail, `record_check`, verification guard, scam auto-review |
| `008_public_columns.sql` | Anonymous reads only through the public view |
| `009_supply.sql` | `submit_event`, submission cap, sport topic, coverage |

Applied locally only. On the remote project they go after 003 to 005, in order,
with `db push --dry-run` first, when you decide.

## Dependencies added

| Package | Why | Vetted |
|---|---|---|
| `@expo-google-fonts/manrope` | Brand font | Expo's official font repository |
| `expo-network` | Online and offline detection | Expo SDK 57 module |
| `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister` | Offline cache and outbox | TanStack, pinned to the installed version |
| `expo-crypto` | Report request ids | Expo SDK 57 module |
| `expo-notifications` | Local reminders (no push) | Expo SDK 57 module, 57.0.23; needs a new native build |
| `expo-secure-store` | Key that seals the sign-in session on phones | Expo SDK 57 module, 57.0.4 |
| `expo-apple-authentication` | Sign in with Apple (iOS) | Expo SDK 57 module, 57.0.2 |

Removed: `@expo-google-fonts/inter`.

## Still open

- Curator sign-in calls Supabase directly; it gets an auth service when accounts are built.
- Legal pages need a lawyer's review; Cameroon's data authority filing is pending.
- The native map and the app on a real phone have not been checked.
- Accounts (email code, Apple untested, Google not built), backup and deletion are built and tested locally; launch needs custom SMTP and a sender domain.
- Not built yet: plans with friends, the website (Phase 10), deleting inactive accounts.
- Reminders and the permission screens are built but not checked on a phone.
- Migration `012_consent.sql` must reach the remote project together with the app release that sends consent.
- Owner actions: start the Google Play closed test early (12 testers for 14 days), choose the hosted Supabase plan and region, set up the WhatsApp Channel and inbox, and review these changes before committing.
