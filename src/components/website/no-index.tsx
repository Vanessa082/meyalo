import Head from 'expo-router/head';

/**
 * Private pages (the console, sign-in, settings) stay out of search engines,
 * as robots.txt also asks (services/event-listing.ts PRIVATE_PATHS).
 */
export function NoIndex() {
  return (
    <Head>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
  );
}
