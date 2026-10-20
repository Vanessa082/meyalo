/**
 * translate-event: machine translation of a published event's title and
 * description (docs/product-decisions.md, Feature 2 and the Feature 6 spec).
 *
 * Pure logic, shared by the Deno function (index.ts) and the Node tests.
 * The caller sends only an event id and a target language; the text always
 * comes from the database, so nobody can use this to translate arbitrary
 * text on our bill. Results go to public.event_translations (003), keyed by
 * a hash of the source text, so each version is translated at most once.
 */

export type TargetLanguage = 'en' | 'fr';

export interface TranslateRequest {
  eventId: string;
  target: TargetLanguage;
}

export type Field = 'title' | 'description';

export interface Translation {
  title: string;
  description: string;
}

export interface Translator {
  provider: string;
  translate(texts: string[], target: TargetLanguage): Promise<string[]>;
}

/** One row of public.event_translations (003_domain_model.sql). */
export interface CacheRow {
  eventId: string;
  field: Field;
  locale: TargetLanguage;
  content: string;
  contentHash: string;
  provider: string;
}

export interface TranslateDeps {
  /** Published events only; null otherwise. */
  loadEvent(id: string): Promise<{ title: string; description: string } | null>;
  /** Cached translations matching these source hashes, by field. */
  readCache(
    eventId: string,
    locale: TargetLanguage,
    hashes: Partial<Record<Field, string>>,
  ): Promise<Partial<Record<Field, string>>>;
  writeCache(rows: CacheRow[]): Promise<void>;
  /** Null until a provider key is configured. */
  translator: Translator | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARGETS: readonly TargetLanguage[] = ['en', 'fr'];

export function parseRequest(body: unknown): TranslateRequest | null {
  if (!body || typeof body !== 'object') return null;
  const { eventId, target } = body as Record<string, unknown>;
  if (typeof eventId !== 'string' || !UUID.test(eventId)) return null;
  if (!TARGETS.includes(target as TargetLanguage)) return null;
  return { eventId, target: target as TargetLanguage };
}

/** Identifies one version of a field's text; a curator edit changes it. */
export async function contentHash(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

export async function handleTranslate(
  deps: TranslateDeps,
  request: TranslateRequest,
): Promise<{ status: number; body: unknown }> {
  const event = await deps.loadEvent(request.eventId);
  if (!event) return { status: 404, body: { error: 'not_found' } };

  // An empty description is not sent anywhere; it stays empty.
  const source: Partial<Record<Field, string>> = { title: event.title };
  const description = event.description.trim();
  if (description) source.description = description;

  const fields = Object.keys(source) as Field[];
  const hashes: Partial<Record<Field, string>> = {};
  for (const field of fields) {
    hashes[field] = await contentHash(source[field] as string);
  }

  const done = await deps.readCache(request.eventId, request.target, hashes);
  const missing = fields.filter((field) => done[field] === undefined);

  if (missing.length > 0) {
    if (!deps.translator) {
      return { status: 503, body: { error: 'not_configured' } };
    }
    let texts: string[];
    try {
      texts = await deps.translator.translate(
        missing.map((field) => source[field] as string),
        request.target,
      );
    } catch {
      return { status: 502, body: { error: 'provider_failed' } };
    }
    const rows = missing.map((field, index) => ({
      eventId: request.eventId,
      field,
      locale: request.target,
      content: texts[index],
      contentHash: hashes[field] as string,
      provider: (deps.translator as Translator).provider,
    }));
    await deps.writeCache(rows);
    for (const row of rows) done[row.field] = row.content;
  }

  const translation: Translation = {
    title: done.title as string,
    description: done.description ?? '',
  };
  return { status: 200, body: translation };
}

const GOOGLE_ENDPOINT =
  'https://translation.googleapis.com/language/translate/v2';

/** Google Cloud Translation (Basic, v2). The key goes in a header so it never
 *  appears in a URL or a log line. */
export function createGoogleTranslator(options: {
  apiKey: string;
  fetch: typeof fetch;
}): Translator {
  return {
    provider: 'google',
    async translate(texts, target) {
      const response = await options.fetch(GOOGLE_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': options.apiKey,
        },
        body: JSON.stringify({ q: texts, target, format: 'text' }),
      });
      if (!response.ok) {
        throw new Error(`Translation failed with status ${response.status}`);
      }
      const json = (await response.json()) as {
        data?: {
          translations?: { translatedText?: unknown }[];
        };
      };
      const items = json.data?.translations ?? [];
      if (
        items.length !== texts.length ||
        !items.every((item) => typeof item.translatedText === 'string')
      ) {
        throw new Error('Translation answer is malformed.');
      }
      return items.map((item) => item.translatedText as string);
    },
  };
}
