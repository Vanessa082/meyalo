/**
 * React Native's URL implementation does not support every accessor, so
 * https links are checked with a pattern rather than `new URL()`.
 */
const HTTPS_URL =
  /^https:\/\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;

/** Host of an https URL, or null when the value is not an https URL. */
export function httpsHost(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = HTTPS_URL.exec(value.trim());
  return match ? match[1].toLowerCase() : null;
}
