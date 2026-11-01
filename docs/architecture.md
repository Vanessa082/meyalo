# Architecture: where each technology lives

Screens and components never talk to a vendor directly. They use hooks
(`src/hooks`), hooks use services (`src/services`), and services depend on
interfaces. Concrete technologies are wired in a few binding files. To replace
one, change its binding and the implementation behind the interface; screens
do not change.

| Concern | Interface (what the app uses) | Binding (the only place the technology is named) | To replace it |
|---|---|---|---|
| Event data | `EventRepository` (`services/event-repository.ts`) | `services/event.service.ts` with `lib/supabase.ts` | Write another `EventRepository`, bind it in `event.service.ts` |
| Suggestions, coverage | `createSupplyService` (`services/supply.ts`) | `services/supply.service.ts` | Reimplement the same functions for the new backend |
| Rules (security, verification, limits) | Database functions and policies (`supabase/migrations`), mirrored in services for early messages | Postgres | Port the migrations; the pgTAP tests in `supabase/tests` describe the required behaviour |
| Storage on the phone | `KeyValueStore` (`services/key-value-store.ts`) | `lib/device-storage.ts` (AsyncStorage) | Change `device-storage.ts` (for example to MMKV) |
| Offline cache and outbox | Hooks in `src/hooks` | `lib/query-client.ts` (TanStack Query) | Rewrite the hooks and `query-client.ts`; screens keep the same hooks |
| Venue search | `Geocoder` (`services/geocoding.ts`) | `services/geocoder.service.ts` (OpenStreetMap) | Add a `Geocoder` (Google behind a server proxy), select it there |
| Device calendar | `addToDeviceCalendar` (`lib/device-calendar.types.ts`), entries from `services/calendar-entry.ts` | `lib/device-calendar.native.ts` (expo-calendar), `lib/device-calendar.ts` (.ics on the web) | Reimplement the two binding files |
| Machine translation | `Translator` (`supabase/functions/translate-event/translate.ts`) | `createGoogleTranslator`, chosen in `translate-event/index.ts` | Add another `Translator` and select it in `index.ts`; the app does not change |
| Maps | `EventMap` props (`components/ui/event-map.types.ts`) | Phones: `components/ui/event-map.native.tsx` (react-native-maps). Web: `components/ui/event-map.tsx` (MapLibre, loaded on demand) with tiles from `config/map.ts` (OpenFreeMap) | Reimplement `EventMap`, or point `config/map.ts` at another MapLibre style |
| Region | `REGION` (`config/region.ts`), cities in `config/discovery/cities.ts` | Configuration | Edit the configuration |
| Public settings | `publicEnv` (`config/env.ts`) | `EXPO_PUBLIC_*` variables | Set variables; no code change |
| Look and feel | Theme tokens (`src/theme`), `Text`, `Page`, `Stack` | `theme/colors.ts`, `typography.ts`, `spacing.ts` | Change tokens; components follow |
| Sign-in (curator console) | None yet | `hooks/use-curator-session.ts` calls Supabase Auth directly | Known gap: add an auth service when accounts are built |

Rules that keep this true:
- No vendor imports in `src/app` or `src/components`. Check with
  `grep -rn "@supabase\|@tanstack\|async-storage" src/app src/components`.
- No raw colours, spacing or font sizes outside `src/theme`.
- Values that vary by deployment come from `config/env.ts`; values that vary by
  market come from `config/region.ts`.
