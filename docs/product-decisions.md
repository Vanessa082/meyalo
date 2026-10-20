# Meyalo — Product Decisions Log

Decisions agreed feature by feature. Implementation must follow this file; changing a decision means updating it here first.

Status values: **Decided** · **In discussion** · **Not started**

## Product frame

- Meyalo is a personalized discovery and planning layer for events and opportunities, starting in Cameroon (Yaoundé, Douala, Buea, Bamenda), then Africa.
- Core question: "What is worth my time, given who I am and what I'm trying to achieve?"
- Out of V0: ticketing, payments, attendance tracking, social feed/followers/comments, organizer dashboards, forced authentication.
- Supported languages: French and English.

## Feature index

| # | Feature | Status |
|---|---|---|
| 1 | Landing / welcome | Decided |
| 2 | Language (FR / EN) | Decided |
| 3 | Discovery profile (onboarding) + For You algorithm | Decided |
| 4 | Authentication (+ calendar connection) | Decided |
| 5 | For You | Decided |
| 6 | Event detail | Decided |
| 7 | Explore: search, filters, sort | Decided |
| 8 | Saved searches & alerts | Decided (post-V0) |
| 9 | Around You | Decided |
| 10 | Save / plan states | Decided |
| 11 | My Month | Decided |
| 12 | Reminders & notifications | Decided |
| 13 | Plans with friends (WhatsApp link) | Decided |
| 14 | Profile & settings (You) + Help & feedback | Decided |
| 15 | Provenance & verification | Decided |
| 16 | Reporting & moderation | Decided |
| 17 | Suggest an event | Decided |
| 18 | Event supply / curation pipeline (+ scalability) | Decided |
| 19 | Organizer submission & claim | Decided |

---

## 1. Landing / welcome — Decided (2026-10-02)

**Language**
- App language follows the device language; any language other than FR/EN falls back to French.
- A visible FR/EN toggle sits on the welcome screen. An explicit choice is persisted and overrides the device language afterwards.

**Actions (hierarchy)**
- Primary button: "Get started" → discovery profile onboarding.
- Secondary text button: "Explore first" → tabs, no questions asked.
- Small footer link: "Already have an account? Sign in" — shown only if authentication is in V0 (depends on Feature 4).

**Content rules**
- Static value proposition only: no live counts, no event cards, no carousel.
- No numbers that can become false, no stock imagery presented as real events, no invented social proof.
- Privacy statements must be literally true. Replace current copy ("No GPS or IP tracking", "No tracking or personal data collection") with accurate wording, e.g. "No account needed. Your preferences stay on this phone."
- Footer links to Privacy Policy and Terms (required by app stores; Cameroon personal data protection law to be confirmed with counsel before launch).
- Must work fully offline.

**"Explore first" behaviour**
- The choice is persisted: next launch opens the tabs directly, not the welcome screen (fixes current bug).
- For You shows upcoming events (Cameroon + online) ordered by date, with no "Why this fits" reasons, plus an inline "Personalize your feed — takes 1 minute" card.

## 2. Language (FR / EN) — Decided (2026-10-02)

- The entire interface is translated in FR and EN, including date, time, number and currency formatting (e.g. "sam. 3 oct.", "20 000 FCFA").
- Every event displays the language(s) it is held in. Explore offers an optional "Event language" filter. Events are never hidden because of language.
- Event titles and descriptions are shown in their original language by default.
- A "Translate" action offers machine translation of event content:
  - Runs server-side (Supabase Edge Function); the provider API key never ships in the app.
  - Translations are cached in the database per event, target language and content version, so each text is translated once and works offline after first load.
  - Translated text is always labelled "Machine translated" with a "Show original" action.
  - Provider: **Google Cloud Translation** (chosen for broad language coverage ahead of African expansion).

## 3. Discovery profile (onboarding) — Decided (2026-10-02)

**Event universe (positioning)**
- Updated 2026-10-18. One inclusion rule: **the event must promote growth**: it builds skills, livelihoods, health, opportunity or community. Audiences are broad, not only tech professionals: students and job seekers, farmers and traders, faith and community groups, arts, sport and leisure.
- Arts, sport and faith events qualify when they have a growth angle (e.g. a music production workshop, a youth sports development day, a church entrepreneurship conference). Pure nightlife and parties do not. Curators apply this rule.

**Flow: three screens, ~30–45 seconds, "1 of 3" progress indicator**
1. Where and how: city (Yaoundé, Douala, Buea, Bamenda as quick picks + searchable list of other Cameroonian cities + "Online events only") and format (in-person / online / both).
2. Interests: multi-select chips from a shared topic taxonomy (tech, business, careers, learning, finance, agriculture, health, creative & media, culture, community, climate, public policy). Final list and FR labels confirmed at implementation.
3. Goals: multi-select chips (learn skills, find work, grow my business, meet people, find funding, share expertise, stay informed).

**Rules**
- Every step is skippable. No preselected answers. The button reads "Skip" when nothing is selected and "Continue" otherwise. Skipped signals are simply not used.
- `onboardingCompletedAt` is set only when the flow is finished or explicitly skipped to the end (fixes current bug where any partial save marked onboarding complete).
- Availability (weekday daytime / evenings / weekends) and budget (free only / paid OK) are NOT asked in onboarding. They appear as one-tap chips in For You and Explore, are editable in You, and are inferred from behaviour.
- Profile is stored on device; it syncs to the server only if the user creates an account (Feature 4).
- Each preference is editable individually from You without re-running onboarding.

**Recommendation algorithm (For You) — deterministic, explainable, replaceable**
1. Hard rules (never shown): ended, cancelled or unpublished events; in-person and hybrid events in another city (online events always eligible; hybrid events elsewhere stay eligible for people who only attend online; updated 2026-10-19); formats the user excluded.
2. Weighted score (initial weights, tunable):
   - Interest match ~35% — event topics vs user interests via the shared taxonomy (no substring matching).
   - Goal match ~30% — what the event offers (learning, networking, hiring, funding, pitching, speaking) vs user goals. Requires curation to tag events with "offers".
   - Timing ~15% — next 30 days preferred; approaching registration deadline adds an urgency label.
   - Learned affinity ~15% — saves/opens raise, "Not interested" lowers, per topic and organizer. Behaviour signals stay on device.
   - Trust & freshness ~5%.
3. Variety re-rank: at most one event per organizer in top picks; no single topic dominates.
4. Output: 3–5 top picks with their top 2–3 reasons in the user's language, then "More upcoming".
5. Plan awareness: overlap with a "Going" plan shows "Conflicts with …".
6. Cold start (no profile): date order, no reasons shown.
- Implemented as a pure, unit-tested TypeScript module running on device, behind an interface that allows moving it server-side later without UI changes. Described to users as personalization, never as "AI".

### What "intelligent" means for For You (owner's answer, 2026-10-19)

All eight chosen. Each needs a measurable check before it counts as done.

| Behaviour | Meaning |
|---|---|
| Learn my habits | Opens, saves and skips move similar events up; signals stay on the phone |
| Catch deadlines | A matching opportunity with a close registration deadline rises |
| Explain every pick | Every top pick says why in plain words |
| Mix, not repeat | Top picks cover different topics and organisers |
| Good with no history | City and interests alone give a sensible top 5 |
| Respect my time | Learns which days and times the person actually goes |
| Fresh and trusted | Recently checked and organiser-confirmed events rank higher |
| Measured by a test | A fixed set of personas and events, with the picks a human expects, runs on every change |

How each is built (2026-10-19; all on the phone, nothing sent anywhere):
- Learn my habits: saves count 1, Going 1.5, opening an event 0.5, "Not my topic" -1, toward that event's topics, organiser and time slot. Each signal fades by half every 60 days, so recent behaviour leads. Each group stays capped, and affinity overall is worth at most 15 points of about 100.
- Catch deadlines: a matching event whose registration closes within 7 days gains 12 points and the reason "Registration closes soon", listed first.
- Explain every pick: every top pick shows at least one reason; habits add "Like events you saved".
- Mix, not repeat: one top pick per organiser (as before) and at most two sharing a topic.
- Good with no history: with only a city and interests, the top picks are the soonest well-matched, trusted events.
- Respect my time: the weekday or weekend and the part of day of events you save, go to or open lift events in the same slot; "Wrong time" lowers it.
- Fresh and trusted: organiser confirmed +5, source confirmed +3 (as before); checked in the last 14 days +3, not checked for 45 days -3.
- Measured by a test: `src/services/ranking.personas.test.ts` describes people and the picks they should and should never get.

## 4. Authentication — Decided (2026-10-02)

**Scope**
- Accounts are optional in V0. Every feature works as a guest. An account backs up and syncs the discovery profile, saved events and plans across devices.

**Methods**
- Continue with Google (native sign-in on Android and iOS).
- Sign in with Apple (iOS; required by App Store rules when Google is offered).
- Continue with Microsoft (browser-based OAuth; for professionals on Outlook/Microsoft 365).
- Email with a 6-digit one-time code (free fallback; code rather than magic link for a smoother mobile flow).
- No phone/SMS or WhatsApp OTP in V0 (cost and delivery reliability).
- Sign-in requests basic identity only (name, email). No calendar or other scopes at sign-in.
- Native Google/Apple sign-in requires a development build (not Expo Go).

**When we ask**
- Never blocking. Invitations only at moments of value: after saving the 3rd event ("Back up your plans"), when enabling alerts, and from the You tab.
- Welcome screen shows only the small "Already have an account? Sign in" link.

**Guest → account**
- On sign-in, device data and account data merge automatically: saved events and plans are unioned and deduplicated; for conflicting preferences the most recent edit wins.

**Security & compliance**
- Session tokens stored in secure device storage (not plain AsyncStorage).
- Authorization enforced by Supabase Row Level Security: users can only read/write their own profile, saved events and plans.
- In-app account deletion that removes server-side personal data (App Store requirement). Signing out keeps the app usable as a guest.

### Spec: accounts (decided 2026-10-19, replaces the methods above)

An account is an optional backup of plans across phones, never a gate. Every feature keeps working as a guest.

**Sign-in.** A 6-digit email code first, then Sign in with Apple (iOS, native sheet), then Google (native). Microsoft is dropped: email codes cover Outlook users, and fewer providers means less to secure. No passwords for users; curators keep theirs. Scopes are basic identity only: Google `openid` and `email`; Apple `EMAIL` (a hidden relay address is accepted). No name, photo or other data is requested, which keeps the Google scopes non-sensitive. Asked only at moments of value: after the third save, from You, and the small "Already have an account? Sign in" link on Welcome.

**Consent at sign-up.** An unticked box before the account is created: what is stored, why, where (Supabase, France, EU), how long, how to delete. Recorded like reports: notice version, language, age group, guardian agreement (required under 18), time.

**What syncs.** Plans (Saved or Going, registered, "Did you go?" answers, each with the time it changed and the copy of the event) and the discovery profile (area, format, interests, goals). Stay on the phone: private notes, hidden and opened events, the learning, reminder and language settings. A future sensitive topic (faith, health condition, politics) would stay on the phone until the open legal question on sensitive data (docs/consent-cameroon.md, question 2) is answered.

**Merge.** The first sign-in on a phone combines its plans with the account's, without duplicates. For one event, each field keeps its most recent change (plan state, registered, attended). For the profile, the most recent edit wins.

**While signed in.** Changes are saved on the phone first, then sent; offline changes go when the network returns. Nothing is shown as backed up until the server confirmed it.

**Sign out** keeps the phone's copy and returns to guest. **Clear data on this phone** also signs out.

**Delete my account** (Privacy and notifications, and a public web page that explains it and lets a signed-in person delete on the web). After a confirmation, the server deletes at once the sign-in identities, email, profile, synced plans and consents linked to the account, and keeps only a deletion record: a one-way hash of the user id, created and deleted times, the consent versions agreed to, and where the request came from. Nothing in it identifies the person. Success is shown only after the server confirms. Earlier anonymous reports and suggestions were never linked to the account and are unchanged.

**Retention (written without a lawyer; review when one is available).**

| Data | Kept |
|---|---|
| Account and synced data | While used. After 24 months without sign-in, an email warns; deleted 30 days later. |
| Deletion record | 3 years, then removed automatically |
| Event reports | 12 months after a curator closes them |
| Event suggestions | 12 months after the decision |
| Consent on reports and suggestions | As long as the row it belongs to |

The 3-year figure is a placeholder for the limitation period for claims in Cameroon, to be checked against the law text. Whether Law 2010/012 art. 46 (10-year retention) applies is checked against the published text before launch, and marked unverified until then.

**Security.** Sessions in secure storage on phones (not AsyncStorage as today in `src/lib/supabase.ts`); browsers use their storage, as the console does. Each person reads and writes only their own rows (RLS, tested with pgTAP and `test:rls`). The deletion function acts only on the caller's own session. Code requests are rate limited. No emails or tokens in logs.

**Edge cases.** Code not received: "Send again" after a cooldown, check spam. Rate limited: "Too many codes. Try again in a few minutes." Sync failure: the plan stays, marked waiting, retried. Deletion failure: error shown, still signed in, retry. Account deleted on another phone: "Your account was deleted. Your plans stay on this phone," then guest. Apple "Hide my email": the relay address is used. The name is not requested. The same verified email through a code and through Google links to one account; an Apple relay address does not.

**Not in this feature.** Plans with friends, organizer accounts, marketing opt-ins, syncing notes or settings, phone or SMS sign-in.

Built 2026-10-20 (local only): sealed session storage (`src/lib/sealed-storage.ts`, AES-GCM key in SecureStore), `013_accounts.sql` (account consents, `sync_account`, deletion records; curators no longer read or write people's plans and profiles), the per-field merge (`src/services/plan-sync.ts`, same rule as the SQL), email code sign-in (`src/app/(auth)/sign-in.tsx`, `verify.tsx`), the backup engine (`components/account/account-sync-provider.tsx`), deletion (`supabase/functions/delete-account`, curators refused), and `014_retention.sql` (daily pg_cron job). Sign in with Apple is built but not tried on an iPhone; Google is not built. Deleting inactive accounts waits for an email provider.

## 5. For You — Decided (2026-10-02)

(Ranking algorithm: see Feature 3.)

- Layout: header → greeting with city selector → quick chips → top picks (3–5, with reasons) → "More upcoming".
- Quick chips refine the feed instantly: This weekend · Free · Online · Registration closing soon. The map card is removed from For You (map lives in Around You). No fake counts, pins or "Updated 1 hour ago" text.
- Time window: next 30 days, with this week's events favoured. Later events are reachable in Explore.
- "Not interested" on each card: hides the event with Undo, then an optional one-tap reason (Not my topic · Too far · Wrong time · Too expensive) that adjusts future ranking on device.
- Weak-match state: an honest message (e.g. "Few matches in Buea this month") followed by clearly labelled wider sections — online events, nearby cities, related topics. Never silently pad the feed.
- Other cities (updated 2026-10-18, hybrid added 2026-10-19): in-person and hybrid events in another city never appear in the main list (hybrid ones do for someone who only attends online). Those that match the user's interests or goals appear in a separate, labelled section ("Beyond <city>: matches your interests"), sorted by distance from the user's city, with the city and approximate distance on each card.
- Standard async states: skeleton loading; error with Retry that is distinct from "no results"; offline shows the last cached feed with "Last updated <time>".

### Spec: quick chips and "Not interested" (2026-10-19)

**Quick chips.** Several can be on at once; an event must match all of them. They apply to every section of the feed, last only while the app is open, and are never stored.

| Chip | An event matches when |
|---|---|
| This weekend | Its start date, in the event's own timezone, is the coming Saturday or Sunday. On a Saturday it means today and tomorrow; on a Sunday, today only. |
| Free | Price is "Free" or "Free with registration". "Price not stated" never counts as free. |
| Online | It is online or hybrid. |
| Registration closing soon | It has a registration deadline that has not passed and is within the next 7 days. |

When the chips leave nothing, the feed says so and offers "Clear filters". It never falls back to unfiltered events without saying so.

**Not interested.** Each card in For You has a "Not interested" button.
1. Tapping it replaces the card, in the same place, with a short panel: "Hidden", an Undo button, and four optional reasons (Not my topic · Too far · Wrong time · Too expensive). The rest of the feed does not move while the user is on the screen; the new order applies the next time the screen opens.
2. Hidden events never appear in For You again until restored from You → Hidden events. They still appear in Explore, because search should find everything.
3. Everything stays on the phone: the event id, when it was hidden, the reason, and a small copy (title, date, organiser, topics, price type, city) so the Hidden list and the ranking work offline.

**Learned affinity (Feature 3, about 15%).** It only reorders matches; it never adds or removes an event. Each signal counts once per event, and each group is capped so a single habit cannot dominate:

| Signal | Effect on other events |
|---|---|
| Saved event | Raises its topics and its organiser |
| Not interested, no reason | Nothing beyond hiding that one event |
| Not my topic | Lowers its topics and its organiser |
| Too far | Lowers in-person events in that city (the "Beyond <city>" list puts that city last) |
| Wrong time | Lowers events at the same part of the week and day (weekday or weekend; morning, afternoon or evening) |
| Too expensive | Lowers paid events |

Opening an event is not counted yet: it needs an event history on the phone that does not exist.

### Look and feel (owner's decisions, 2026-10-19)

- Colour (final, 2026-10-19): black, white and one brand colour, blue, like Meta's apps (after lime, green and a violet third colour were tried). Amber and red only for warning and error. Verified events carry a seal with a check (blue: organiser confirmed; grey: confirmed at the official source), with the trust words beside it.
- Cards without a photo: clean white cards where the date is the picture, not coloured tiles.
- Welcome screen: a short muted loop at the top on the web, behind gates (no Reduce Motion, no Save-Data, not on 2G/3G), loaded only after the page. Phones play the same loop from inside the app with `expo-video` (owner's decision, 2026-10-19); only Reduce Motion stops it there. It shows a real person (a speaker at a conference, Pexels, approved by the owner); see BRAND.md for the source and licence limits.
- Posters lead: every event shows a poster card; the organiser's own image replaces the date card when a curator uploads one we may use. No stock photos on events, no images copied from source pages.
- For You: a "Top picks" or "This week in <city>" carousel, a "Registration closing soon" rail, up to three topic rails, then the list. Every event appears once.
- Event page: poster hero, trust card, date, place with a small map when the venue is pinned, price, and a bottom bar with Save and Register.
- Motion (from the launch and motion research): static splash that fades out over 250 ms; the first six items rise and fade in, 40 ms apart, 280 ms each; cards shrink slightly under the finger; saving pops the icon. Only opacity and transform animate. Everything stops under Reduce Motion. No autoplay carousels, parallax or looping background motion.
- A format preference that hides events is always shown on For You, with a way to change it.

## 6. Event detail — Decided (2026-10-02)

**Primary action**
- "Register on <domain>" when a registration URL exists; otherwise "View details on <domain>". `source_url` and `registration_url` stay separate.
- The destination domain is always visible before leaving the app. Only `https` URLs are opened; anything else is rejected at validation.

**Content rules**
- Price shows exactly what is known: "Free", "20 000 FCFA", "From 5 000 FCFA", or "Price not stated". Never assume free.
- Missing fields are stated honestly ("Venue to be confirmed", "End time not stated"). No fallback values such as a default city or generic description.
- Date/time shown in the event's timezone, formatted in the app language.
- Event language(s) always shown.
- Images: the event's own image only when we have the right to use it (organizer-provided or source permits); otherwise a branded typographic placeholder (category icon + date). No stock photos.
- Ended events opened from a saved plan or shared link show an "This event has ended" banner and no Register button.

**Action hierarchy**
- Sticky bottom bar: primary Register/View button + Save.
- Secondary row: Add to calendar · Share · Directions (Directions only for in-person/hybrid events with an address or coordinates; opens the phone's maps app).
- Translate: inline next to the description, only when event language differs from app language (see Feature 2).
- Report a problem: low-emphasis link near the bottom (see Feature 16).
- "More from this organizer": closing section, only if the organizer has other upcoming events.

**Sharing**
- Share opens the system share sheet with WhatsApp prioritised. The message contains title, date, place and a Meyalo event link.
- The link opens a lightweight public web page for the event (title, date, place, Register button, "Get the app"), and opens the app directly when installed (universal links / app links). Event pages show only published event data.
- The public base URL comes from configuration (see "Domain & configuration" below). Until a custom domain is bought, the free Expo hosting address (`*.expo.app`) is used.
- Built 2026-10-18: "Share on WhatsApp" is the main share action (a `wa.me` link, no API, no cost; a new tab on the web), with "Share" for the system sheet where it exists. The message is one fact per line in the app language: title, date, place, price, link, "Found on Meyalo"; unknown details are left out, never invented. Without a public site address the app shares the text without a link rather than an app-only link. Event pages carry link-preview tags built at deploy time (docs/environment.md, "Web build and link previews").

### Spec: Add to calendar, Directions, Translate (2026-10-19)

**Add to calendar.** The phone's own calendar screen opens prefilled; the user picks the calendar and confirms there, so Meyalo never writes silently.

| Platform | How | Permission |
|---|---|---|
| iOS | System event form, default calendar | Write only (iOS 17+), asked on the first tap, never at launch |
| Android | The calendar app's "new event" screen | None. The calendar read and write permissions are blocked in the build until conflict checks need them |
| Web | Downloads an `.ics` file that Google, Apple and Outlook calendars open | None |

The entry holds the title, start, end, place, the organiser and the registration or source link. When the end time is not stated, the entry lasts 2 hours and its notes say "End time not stated"; nothing else is invented. Online events use "Online" as the place. If the user refuses permission, a message explains how to allow it in Settings; nothing else happens.

**Directions.** Shown only for in-person and hybrid events with coordinates or a street address (a city alone is not enough). Opens the phone's maps app: Apple Maps on iOS, the default maps app on Android (`geo:`), Google Maps in a new tab on the web. Coordinates win over the address when both exist.

**Translate.** Shown next to the description only when none of the event's languages is the app language. Runs on the server so the provider key never ships in the app (Feature 2). Results are cached per event, target language and a hash of the text. Translated text is labelled "Machine translated" with "Show original". Until the translation service is configured, the action is not shown at all.

### Spec: event images (2026-10-19)

- Curators add an image in the web console, on the event's page. Before upload they must state the right to use it: the organiser provided it, the official source allows reuse, or it is our own photo. Alt text (what the image shows, for screen readers) is required; a credit line is optional and shown under the image on the event page.
- The browser resizes before upload: 1600 px wide for the event page, 640 px for cards, WebP. Nothing larger is stored, so phones on slow networks never download full-size photos.
- Stored in a public `event-images` bucket (2 MB per file, JPEG, PNG or WebP). Only curators can upload, replace or remove, enforced by the database. Removing the image brings back the date card.
- The rights answer is kept with the event for curators; the public sees the image, its alt text and the credit.

## 7. Explore — Decided (2026-10-02)

**Default view (no query, no filters)**
- Browse sections: date shortcuts (Today · This weekend · This week), topic tiles, and "Recently added".

**Search**
- Server-side, paginated, accent-insensitive, FR and EN.
- Searches title, description, organizer, topics, venue and city.

**Filters**
- Chips always visible: Date (presets + custom range) · City (multi-select) · Format (in-person / online / hybrid) · Free.
- "More filters" sheet: Topic · What it offers (learning, networking, hiring, funding, pitching, speaking) · Event language · Registration still open.
- Active-filter count badge and "Clear all". Result counts are real.
- Filter and search state live in typed, validated route parameters, so a filtered view can be restored and deep-linked.

**Sort**
- Soonest first (default) · Best match for you (uses the Feature 3 ranking) · Recently added.

**Past events**
- Never appear in Explore results. They are reachable only from the user's own plans or a shared link, with an "ended" banner.

### Spec: server search with filters in the address (2026-10-19)

**Address.** Every search and filter lives in the page address, so a view can be shared, bookmarked and restored: `/explore?q=pitch&when=weekend&city=buea,douala&format=in_person,hybrid&free=1&topic=technology&offer=funding&lang=fr&open=1&sort=recent`. Unknown or invalid values are dropped, never guessed. Defaults are left out of the address.

| Parameter | Values |
|---|---|
| `q` | Up to 100 characters |
| `when` | `today`, `weekend`, `week` (to the end of Sunday), in the launch region's timezone |
| `city` | Launch city ids (`config/discovery/cities.ts`) |
| `format` | `in_person`, `virtual`, `hybrid` |
| `free` | `1`: free or free with registration |
| `topic`, `offer` | Taxonomy ids |
| `lang` | `en`, `fr` |
| `open` | `1`: registration not closed (no deadline, or a deadline still ahead) |
| `sort` | `soonest` (default), `recent` (recently added) |

**Search.** On the server, through `search_public_events` (migration 010): accent and case insensitive, every word must appear in the title, description, organiser, venue or city, or the whole text names a topic in French or English. Past events never appear: an event is shown until its end, or its start when no end is stated. 20 results per page with "Load more"; the total count is real and comes from the same query.

**Default view.** With nothing chosen: date shortcuts (Today · This weekend · This week) and topic shortcuts, which only set filters, above the soonest results.

**Not in this step.** Custom date range, "Best match for you" sort (needs ranking across all pages, not one), and the "More filters" sheet design beyond a simple expandable section.

## 8. Saved searches & alerts — Decided: post-V0 (2026-10-02)

- Not in V0. Revisit once For You and My Month show retention and event supply is steady enough that alerts are worth receiving.
- When built: saved filter combinations, delivered by push, requires an account and a server-side matching job.

## 9. Around You — Decided (2026-10-02)

- Scope: in-person and hybrid events only.
- Default view: list sorted by distance, with a "Map" toggle (saves mobile data, works on weak connections). The map loads only when toggled.
- Location:
  - Asked only when the user taps "Use my location" in Around You — never at app launch.
  - Approximate location is sufficient; foreground only (while the app is open).
  - Location is used on device to compute distances and is not stored on our servers.
  - Without permission (denied, unavailable, GPS off, timeout): distances are measured from the profile city's centre or a neighbourhood the user picks from a curated list. The screen never blocks.
- Distance presets: Within 2 km · 5 km · 10 km · Whole city (default), sorted nearest first.
- Distances are straight-line and labelled approximate ("~3 km"); travel directions come from the Directions action.
- Events without coordinates appear in a "Location not pinned" group at the bottom; no invented distance.
- Requires curated coordinates (geocoded venues) in event supply (Feature 18).

## 10. Save / plan states — Decided (2026-10-02)

- Two states per event: **Saved** (considering) and **Going** (committed). Going events can additionally be ticked **"I've registered"**, because registration happens outside Meyalo.
- Save/Going actions are idempotent "set state" operations (not toggles), applied optimistically, serialized, and safe to retry.
- Stored on device for guests; synced to the server when signed in (Feature 4 merge rules).
- Saved plans keep a snapshot of key event fields so My Month works offline and survives the event being unpublished.

## 11. My Month — Decided (2026-10-02)

- Layout: compact month calendar on top (dots on days with entries, swipe between months) + agenda list grouped by day below.
- Contents:
  - Going events.
  - Registration deadlines of Saved and Going events as separate entries ("Registration closes: <event>"), hidden once ticked "I've registered".
  - Saved events in a separate "Considering" section.
- Conflicts:
  - Overlapping times with another Going event, or with a busy slot in the phone calendar (if read access granted), = conflict.
  - Same day in different cities = softer "travel" warning.
- Free weekend days show at most one light row: "Your Saturday is free — N matches", using the For You ranking.
- Past entries move to a collapsed "Past" section; ended events show an "ended" state.
- Changed or cancelled events (detected on next sync/app open) show a "Changed" / "Cancelled" badge and reminders are rescheduled or removed. Push notification of changes is post-V0.

### Spec: My Month and plan states (2026-10-19)

**Plan states (Feature 10).** Each planned event is Saved (considering) or Going. The bookmark puts an event in your plans as Saved, or takes it out whatever its state; "I'm going" on the event page moves it to Going (and back to Saved). Going events can be ticked "I've registered". Existing saves become Saved; nothing is lost. All on the phone, as today.

**Calendar.** A month grid, weeks starting on Monday, days read in the launch region's timezone. A dot marks a day with a Going event or an open registration deadline. Arrows move between months; tapping a day narrows the agenda to it, tapping again shows the whole month.

**Agenda for the month, by day.**
- Going events.
- "Registration closes: <event>" on the deadline's day, for Saved and Going events, until ticked "I've registered".
- Conflicts on Going events: "Clashes with <event>" when times overlap (an event without an end time counts as 2 hours, as in the calendar export); "Another city the same day" when two in-person events are in different cities the same day without overlapping.
- The coming weekend, if it has no Going event: one light row per free day, "Your Saturday is free: N events for you", linking to Explore for this weekend. N comes from the same feed as For You.
- "Cancelled" and "Changed" (date or place differs from when it was saved) badges, by comparing the saved copy with the live event.

**Considering.** Saved events in their own section, soonest first.

**Past.** Planned events that have ended are collapsed under "Past" with an "Ended" label.

**Not in this step.** Reading busy times from the phone calendar (needs calendar read permission, still blocked) and swiping between months (arrows only).

## 12. Reminders & notifications — Decided (2026-10-02)

- V0 uses local notifications scheduled on the phone (no account or server needed).
- Notification permission is requested the first time the user marks an event "Going", never at launch.
- Defaults (all adjustable or off in settings, and per event):
  - Going events: evening before at 18:00 + 2 hours before start.
  - Registration deadlines of Saved/Going events not ticked "I've registered": 2 days before + morning of the deadline.
- Reminder times are computed from the event's absolute start time (timezone-correct).
- Tapping a notification opens the event detail.

### Spec: consent, privacy settings and notifications (2026-10-19)

Grounded in `docs/consent-cameroon.md` (Law 2024/017: consent is the basis, no "legitimate interest"; under 18 needs a parent; transfers abroad must be named). Points marked there for the lawyer stay open.

**Consent at every submission to our server.** "Report a problem" and "Suggest an event" each end with an unticked box: what is sent, why, that it is stored in France (EU) by our host, how long, and how to ask for deletion. Nothing is sent until it is ticked. The notice has a version (`config/consent.ts`); a change of wording means a new version.

**Age.** Asked once, inside the first consent box, and remembered on the phone: "18 or older" or "Under 18". Under 18 adds a second required box: "A parent or guardian agrees". Changeable in Privacy settings.

**The consent record.** Stored with the data it covers, in the same row: notice version, language, age group, guardian agreement, time. The database refuses a report or suggestion without them. Choices about the phone itself (notifications, learning from activity) are kept on the phone with the time they were last changed.

**Privacy and notifications (You).** One screen:
- Reminders: on or off, with the phone's permission state and a way to its settings.
- Learn from my activity (moved here from You).
- Your age group.
- Data on this phone: what is kept, and "Clear data on this phone" (profile, plans, hidden and opened events, settings), with a confirmation.
- Data on our server: reports and suggestions are anonymous; how to ask for deletion; link to the Privacy Policy.

**Before any system permission.** A short screen of our own first: what the permission is for, what it never does, "Allow" (then the system prompt) or "Not now". Never at launch. Used for notifications now and for calendar access.

**Reminders (Feature 12).** Asked the first time someone marks an event Going. Local notifications only, scheduled from absolute times: Going events the evening before at 18:00 and 2 hours before; registration deadlines 2 days before and on the morning of the deadline, until ticked registered. Only future times are scheduled; everything is rescheduled when plans change or the app opens. Tapping opens the event. Phones only: the web has no reminders.

Built 2026-10-19:
- `012_consent.sql`: consent columns on `reports` and `submissions`, a completeness check (under 18 needs the guardian), the server stamps `consented_at`, the report insert rule and `submit_event` refuse anything without consent. Tested in `supabase/tests/09_consent.test.sql`.
- The consent box (`components/consent/consent-block.tsx`) ends the report sheet and `/submit`. The age group is remembered on the phone (`services/age-group-setting.ts`) and asked again only if unreadable. The notice points to the Privacy Policy for how long data is kept, because that period is not decided yet (lawyer question 4 in `docs/consent-cameroon.md`).
- Privacy and notifications (`/privacy-settings`, from You): Reminders, Learn from my activity, age group, Clear data on this phone (every key in `services/device-data.ts`, queued reports and scheduled reminders, with an inline confirmation), and what reaches our server.
- The explanation screen (`components/privacy/permission-primer.tsx`) comes before the notification prompt (first Going) and before the iOS calendar prompt (first Add to calendar). Android adds to the calendar without a permission.
- Reminders (`services/reminder-schedule.ts`, pure and tested; `lib/reminders.native.ts`): the 18:00 time and the deadline morning (08:00) are in the event's timezone. Inexact alarms: a reminder may arrive a few minutes late, and Meyalo does not ask for the exact alarm permission. At most 60 are scheduled, the soonest first (iOS keeps 64).
- Not checked on a real phone yet: the prompts, delivery and opening an event from a reminder.

### Spec: after an event ends (decided 2026-10-19)

An ended event stops being something to plan and becomes something to look back on. Nothing here goes to our server.

**On the event page.** A banner replaces the Save and Register bar: "This event ended on <date>". Below it, "More like this" opens Explore filtered to the event's topics (any of them; topics have no order of importance) and city. Directions, Add to calendar and Report are hidden; Share stays (people share what they went to).

**"Did you go?"** Shown on the event page and in My Month, Past, for events that were Saved or Going. Two buttons, Yes and No, and the answer can be changed. Stored on the phone with the time.
- Yes is the strongest learning signal: the event's topics count more than Going (weight 2, with the same 60-day half-life). Only while Learn from my activity is on.
- No is neutral: missing an event is not disliking its topic.
- A Going event with no answer after 14 days counts as nothing.

**"What did you get out of it?"** After Yes, an optional private note (500 characters) kept on the phone, shown on the event in Past. A Share button sends "I went to <title>: <note>" with the event link through the share sheet (WhatsApp first). Notes are part of "Clear data on this phone".

**My Month, Past.** Each past event shows its Did you go chips, or the note once answered. The list keeps the last 90 days; older plans are removed from the phone.

**"How was it?" reminder.** One only, at 10:00 the morning after a Going event ends (event timezone), under the Reminders switch, while "Did you go?" is unanswered. Tapping it opens the event.

**Still open.** Whether "Yes" should put the organizer's next events first in "More like this", and whether 90 days is the right limit.

Built 2026-10-19: `saved-events-store.ts` (`attended`, `attendedAt`, `note`, removal 90 days after the end on the next change), `affinity.ts` (Yes weighs 2; an unanswered Going stops counting 14 days after the end), `reminder-schedule.ts` (`how_was_it`), `components/event/did-you-go.tsx` on the event page and in My Month, Past, and `moreLikeThis` in `explore-params.ts`. An ended event later taken down still opens from the plan's saved copy.

## 13. Plans with friends — Decided (2026-10-02)

- From a Going event, "Invite friends" creates a private plan and shares its link (WhatsApp first).
- Friends open the link in a browser and answer "I'm in / Maybe / Can't" with a first name only; no app or account required. The plan owner sees responses in the app.
- Not a social network: no profiles, followers, feeds or comments. Plan links are unguessable tokens; plans expire after the event; respondents' data is limited to first name + answer and deleted with the plan.
- A plan needs a server-side owner: guests get an anonymous Supabase session created at the moment they first share, which upgrades to a permanent account on sign-in. The discovery profile still stays on device.
- Abuse controls: rate limits on plan creation and responses; owner can close or delete a plan.

## 14. Profile & settings (You) — Decided (2026-10-02)

Sections, in order:
1. Account — guests: "Back up your plans" card (sign-in options). Signed in: name, email, sign out, delete account.
2. Discovery preferences — city, formats, interests, goals, availability, budget; each editable individually.
3. Calendar — chosen device calendar; "Check conflicts with my calendar" toggle.
4. Notifications — reminder defaults on/off and timing.
5. Language — Français / English.
6. Hidden events — everything marked "Not interested", with restore.
7. Privacy & data — plain-language explanation of what is stored on the phone vs on our servers; "Clear data on this phone".
8. About & help — Help & feedback, Terms, Privacy Policy, app version.

**Help & feedback (in-app, Shopify-style)**
- Form: category (Bug · Idea · Wrong event info · Other), message, optional screenshot, optional reply email (pre-filled when signed in).
- "Wrong event info" routes into the event report flow (Feature 16).
- Auto-attached: app version, OS, app language. Never location.
- Stored in the database (insert-only for clients via RLS), screenshot in private storage; rate-limited; reviewed in the admin tool (Feature 18).

## Domain & configuration — Decided (2026-10-02)

- Every domain-dependent feature (event web pages, share links, friend plans, universal/app links) reads the public base URL from configuration (environment variable), never from hardcoded strings.
- Until a custom domain is purchased, the free Expo hosting address (`*.expo.app`) is used.
- Switching domains: update the environment value and redeploy the web. For links that open the app directly, iOS/Android embed the domain at build time, so a new app build is also required — no code changes.

## 15. Provenance & verification — Decided (2026-10-02)

- States (with operational rules):
  - **Unreviewed** (internal): any newly ingested or submitted event. Never published.
  - **Source confirmed** (public): a curator checked title, date/time, place, format and links against the official source. Records who checked and when.
  - **Confirmed by organizer** (public): the organizer confirmed the details directly (verified contact or claimed listing).
- No generic "Verified" badge anywhere. The existing `is_verified` boolean is replaced by this state machine.
- Freshness: every published event is re-checked within the 7 days before it starts. Cards show "Checked <date>". If not checked for 14+ days, show "Details may have changed — confirm at source".
- Every event records its provenance: source URL, source type (organizer site, social post, partner feed, user suggestion, organizer submission, collector), and the submission it came from.
- Updated 2026-10-18 (enforced by the database, `007_verification.sql`):
  - Every check is a row in an evidence trail (curators only): how it was checked (official site, official social account, contact with the organizer, partner feed), the evidence link, red flags seen, whether a fee is charged, notes, who and when. Verification changes only through this; a check date always has evidence behind it.
  - A check with any red flag cannot confirm. Organizer confirmation needs direct contact with the organizer.
  - Fee-charging opportunities need confirmations from two different curators. Until then they are not confirmed, and an already confirmed one goes back to review.
  - Freshness is a flag only: stale events stay published, show when they were last checked, and appear in the curator re-check views.
  - Partner organizers: a flag on the organizer. The app badge comes later.
  - Event pages always say: "Meyalo never asks you to pay to apply."

## 16. Reporting & moderation — Decided (2026-10-02)

- "Report a problem" reasons: Cancelled/postponed · Wrong date or time · Wrong place · Broken link · Looks like a scam · Duplicate · Other (+ note).
- Updated 2026-10-18: two "Looks like a scam" reports within 24 hours take a published event down for review automatically (a signed-in reporter counts once). Not for organizer-confirmed events or partner organizers, so anonymous reports cannot take down trusted organizers. Other reasons go to the curator queue only. Reports are rate limited (006).
- No account required; rate-limited per device/session.
- 3 independent "Looks like a scam" reports automatically set the event to "Under review" (hidden from discovery) until a curator decides.
- All reports go to the admin review queue (Feature 18).

## 17. Suggest an event — Decided (2026-10-02)

Built as part of a single, future-proof intake pipeline (see Feature 18):
- Inputs: paste a link, attach a flyer photo, or paste text (e.g. a forwarded WhatsApp message); share directly into Meyalo from other apps (WhatsApp, Instagram, browser) via the system share sheet; optional note.
- Automatic extraction pre-fills event fields from the link/flyer/text server-side; a curator always reviews before publishing.
- Duplicate detection against existing and pending events.
- The submitter sees status: Under review · Published · Not added (with reason). Published events can credit "Suggested by the community".
- Future channel: a Meyalo WhatsApp number that accepts forwarded flyers (requires WhatsApp Business API).
- Built 2026-10-18 (first version, `009_supply.sql`): a public `/submit` page (web and app, no account) takes a link and/or a description and an optional note, states the growth rule, and gives a private status link (id and token) that shows Under review, Added, or Not added with the curator's reason. Curators decide in the console under Submissions. Anonymous submissions are capped at 60 per hour in total until a per-device limit (Turnstile) is needed. Not built yet: flyer photos, share-sheet intake, automatic extraction, duplicate detection.

## 18. Event supply / curation pipeline — Decided (2026-10-02)

**Single intake pipeline**
- Sources: curator entry, user suggestions (Feature 17), organizer self-submission (Feature 19), automated collectors, partner feeds.
- Flow: staging submission → extraction → normalization (timezone, city, coordinates, topics, offers, language, price) → duplicate check → curator review → publish. Nothing automated publishes directly; ingested events start as Unreviewed.
- Ended events are expired automatically by a scheduled database job.

**Automated collection guardrails**
- Only allow-listed sources, each with its terms of service/robots policy checked and recorded.
- Prefer structured data published for discovery: schema.org Event markup, iCal/RSS feeds, official APIs.
- Respect robots.txt, rate-limit, identify the collector.
- Excluded: platforms whose terms prohibit scraping (e.g. Facebook, Instagram) and wholesale copying of competitor directories (pursue partnerships instead, e.g. agenda.cm).

**Admin tool**
- Internal admin web area in the same codebase; access requires an admin role enforced by database Row Level Security (not just hidden UI).
- Functions: create/edit events with duplicate warnings; review queues for submissions, reports and feedback; verification actions (Feature 15); re-check reminders for upcoming events.

**Extraction engine**
- Google Gemini (Flash tier) on the free quota, server-side, behind a provider interface so it can be swapped by configuration.
- When the quota is exhausted, submissions stay queued and are retried later; curators can always fill fields manually.
- Only event content (flyers, public links, pasted event text) is sent — never user personal data — because free-tier inputs may be used by the provider.
- Updated 2026-10-18: coverage view in the console (upcoming published events per launch city plus Online, against every topic, zeros highlighted) and a sources list in `docs/event-sources.md`. Sport is a topic (`sport_wellbeing`) under the growth rule.

## 19. Organizer submission & claim — Decided (2026-10-02)

- Organizers need an account (Feature 4). They can submit new events and claim existing listings. Meyalo never depends on organizers; this only adds supply.
- Identity: automatic when the sign-in email matches the organizer's website domain; otherwise a curator confirms via the official contact channel listed at the source. Only then do their events/edits count as "Confirmed by organizer".
- Edits by confirmed organizers:
  - Minor (description, image, registration link on the same domain): publish immediately.
  - Major (date, time, place, cancellation): publish immediately, flagged for curator check; users who saved the event see a "Changed" badge.
- Stats: aggregate only — views, saves, Going count, registration clicks. Never individual user identities.
- Organizer submissions go through the same intake pipeline (Feature 18).

## Visual identity: Decided (2026-10-18)

- Full rebrand inspired by learning.md: off-white background, deep green ink, forest green primary, lime accent used only as a fill behind dark text, Manrope with heavy headlines, pill-shaped buttons. Logo, app icon and splash are recoloured to match. Palette and type only; no third-party logos or imagery. Details live in BRAND.md once implemented.

## Maps and venue locations: Decided (2026-10-18)

- Curators find a venue's coordinates with a "Find" search in the console. Provider today: OpenStreetMap Nominatim (free). It is used within its usage policy: one request per button press, never while typing, at most one per second, results cached, attribution shown, switchable off with `EXPO_PUBLIC_GEOCODER_URL=off`.
- The console depends only on a `Geocoder` interface, so a paid provider (Google) can replace OpenStreetMap later without changing the console. Any provider with a secret key runs behind a server proxy.
- The console lists published in-person events that are not on the map yet, so curators can fill them.
- Around You has a List / Map toggle on phones. The map loads only when chosen and shows only events with real coordinates. Google Maps is used when a key is configured, otherwise the platform map (Apple Maps on iOS). No map on web until the website (Phase 10).

## Costs & budget — Decided (2026-10-02)

Prefer free tiers; every paid service sits behind an interface so it can be swapped.
- Free tiers: Gemini extraction, Google Cloud Translation (cached), Expo web hosting (`*.expo.app`), email OTP via Supabase, local notifications, device calendar, Apple Maps (iOS) / Google Maps SDK (Android).
- Unavoidable for a public launch (verify current prices before committing): paid Supabase plan (to avoid project pausing), Apple Developer Program (yearly), Google Play developer registration (one-time). Custom domain optional.

## Scalability & operations — Decided (2026-10-02)

- Public event data is identical for all users → cache aggressively: persisted client cache, paginated narrow queries, CDN caching for public web event pages, resized images via storage CDN.
- Personalization runs on device, so the server does no per-user ranking.
- Heavy work (collection, extraction, translation, expiry) runs in background jobs, never in the request path. Translations are cached.
- Database: indexes for all discovery queries, Supabase connection pooling; scale compute / add read replicas on paid plans as traffic grows.
- Rate limits on all client writes (reports, feedback, suggestions, plan responses).
- Error monitoring and a load test before public launch.
- Production runs on a paid Supabase plan (free-tier projects pause after inactivity, which caused the outage observed on 2026-10-02).

## Calendar integration (applies to Features 10–12) — Decided (2026-10-02)

- Calendar connection uses the phone's own calendar via the system calendar permission, not account OAuth. Works for guests and for every provider synced to the phone (Google, iCloud, Outlook).
- Separate from sign-in; permission is requested the first time the user taps "Add to calendar" or enables conflict checking.
- Opt-in read and write:
  - Write: add a Meyalo plan to a chosen device calendar.
  - Read: busy times are read on device only to detect conflicts with real appointments; never stored on our servers or sent anywhere.
- Server-side calendar sync (Google/Microsoft APIs) deferred until there is a web version.
