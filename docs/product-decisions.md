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
- Growth-oriented and broad: professional, learning, tech, entrepreneurship, plus community, culture and creative events that help people grow or connect. Not nightlife/parties/concerts-as-entertainment in V0.

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
1. Hard rules (never shown): ended, cancelled or unpublished events; in-person events in another city (online and hybrid always eligible); formats the user excluded.
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

## 5. For You — Decided (2026-10-02)

(Ranking algorithm: see Feature 3.)

- Layout: header → greeting with city selector → quick chips → top picks (3–5, with reasons) → "More upcoming".
- Quick chips refine the feed instantly: This weekend · Free · Online · Registration closing soon. The map card is removed from For You (map lives in Around You). No fake counts, pins or "Updated 1 hour ago" text.
- Time window: next 30 days, with this week's events favoured. Later events are reachable in Explore.
- "Not interested" on each card: hides the event with Undo, then an optional one-tap reason (Not my topic · Too far · Wrong time · Too expensive) that adjusts future ranking on device.
- Weak-match state: an honest message (e.g. "Few matches in Buea this month") followed by clearly labelled wider sections — online events, nearby cities, related topics. Never silently pad the feed.
- Standard async states: skeleton loading; error with Retry that is distinct from "no results"; offline shows the last cached feed with "Last updated <time>".

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

## 12. Reminders & notifications — Decided (2026-10-02)

- V0 uses local notifications scheduled on the phone (no account or server needed).
- Notification permission is requested the first time the user marks an event "Going", never at launch.
- Defaults (all adjustable or off in settings, and per event):
  - Going events: evening before at 18:00 + 2 hours before start.
  - Registration deadlines of Saved/Going events not ticked "I've registered": 2 days before + morning of the deadline.
- Reminder times are computed from the event's absolute start time (timezone-correct).
- Tapping a notification opens the event detail.

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

## 16. Reporting & moderation — Decided (2026-10-02)

- "Report a problem" reasons: Cancelled/postponed · Wrong date or time · Wrong place · Broken link · Looks like a scam · Duplicate · Other (+ note).
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

## 19. Organizer submission & claim — Decided (2026-10-02)

- Organizers need an account (Feature 4). They can submit new events and claim existing listings. Meyalo never depends on organizers; this only adds supply.
- Identity: automatic when the sign-in email matches the organizer's website domain; otherwise a curator confirms via the official contact channel listed at the source. Only then do their events/edits count as "Confirmed by organizer".
- Edits by confirmed organizers:
  - Minor (description, image, registration link on the same domain): publish immediately.
  - Major (date, time, place, cancellation): publish immediately, flagged for curator check; users who saved the event see a "Changed" badge.
- Stats: aggregate only — views, saves, Going count, registration clicks. Never individual user identities.
- Organizer submissions go through the same intake pipeline (Feature 18).

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
