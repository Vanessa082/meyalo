/**
 * Writes src/generated/event-previews.json: link-preview data and the
 * website's event list (docs/product-decisions.md, Feature 20) for every
 * upcoming published event, read with the public (anon) key, exactly as the
 * app sees them. Run before `expo export` (pnpm build:web) so each event page
 * gets its own Open Graph tags. Fails loudly when Supabase is configured but
 * unreachable, so a deploy never silently ships without previews.
 *
 * Uses EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from the
 * environment, else from .env. Only public, published event data is read.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';

const OUT = new URL('../src/generated/event-previews.json', import.meta.url);
const LIMIT = 100;
mkdirSync(new URL('../src/generated/', import.meta.url), { recursive: true });

const EMPTY = `${JSON.stringify({ generatedAt: null, events: {}, listing: [] }, null, 2)}\n`;
const SITEMAP = new URL('../public/sitemap.xml', import.meta.url);
const ROBOTS = new URL('../public/robots.txt', import.meta.url);

// postinstall: make sure the file exists so a fresh clone typechecks and
// bundles, without touching Supabase.
if (process.argv.includes('--empty-if-missing')) {
  if (!existsSync(OUT)) writeFileSync(OUT, EMPTY);
  process.exit(0);
}

if (!process.env.EXPO_PUBLIC_SUPABASE_URL && existsSync('.env')) {
  process.loadEnvFile('.env');
}
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !key) {
  console.warn('Supabase is not configured: writing empty event previews.');
  writeFileSync(OUT, EMPTY);
  process.exit(0);
}

// Loaded only for a real build: postinstall needs none of this.
const { createClient } = await import('@supabase/supabase-js');
const { describeEventCard, toEventCard } = await import(
  '../src/services/event-mapping.ts'
);
const { createLocalizer } = await import('../src/i18n/translate.ts');
const { toEventPreview } = await import('../src/services/event-preview.ts');
const { buildRobots, buildSitemap, toListingItem } = await import(
  '../src/services/event-listing.ts'
);
const { normalizeBaseUrl } = await import('../src/config/env.ts');
const { createEventRepository } = await import(
  '../src/services/event-repository.ts'
);

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const page = await createEventRepository(client).listPublished({
  filters: { startsFrom: new Date().toISOString() },
  sort: 'start_asc',
  limit: LIMIT,
});

// Link previews keep the English they had before the app was bilingual.
const readCatalog = (language) =>
  JSON.parse(
    readFileSync(
      new URL(`../src/i18n/messages/${language}.json`, import.meta.url),
      'utf8',
    ),
  );
const i18n = createLocalizer(
  { en: readCatalog('en'), fr: readCatalog('fr') },
  'en',
);

const events = Object.fromEntries(
  page.items.map((event) => {
    const card = toEventCard(event);
    const preview = toEventPreview(card, describeEventCard(card, i18n));
    return [preview.id, preview];
  }),
);
const listing = page.items.map((event) => toListingItem(toEventCard(event)));
writeFileSync(
  OUT,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), events, listing }, null, 2)}\n`,
);

// Search files need the public address. Without it, remove old copies so a
// build never ships a sitemap pointing at another address.
const baseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_APP_BASE_URL);
if (baseUrl) {
  const cityIds = [
    ...new Set(listing.map((item) => item.cityId).filter(Boolean)),
  ];
  writeFileSync(
    SITEMAP,
    buildSitemap(baseUrl, {
      cityIds,
      eventIds: listing.map((item) => item.id),
    }),
  );
  writeFileSync(ROBOTS, buildRobots(baseUrl));
  console.log(`Wrote sitemap.xml and robots.txt for ${baseUrl}.`);
} else {
  for (const file of [SITEMAP, ROBOTS]) {
    if (existsSync(file)) unlinkSync(file);
  }
}
console.log(
  `Wrote ${page.items.length} event previews${page.nextCursor ? ` (first ${LIMIT}; more exist)` : ''}.`,
);
