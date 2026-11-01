// Deno entry for translate-event. The logic lives in translate.ts, tested
// with Node; this file only wires it to Supabase and the provider.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createGoogleTranslator,
  type Field,
  handleTranslate,
  parseRequest,
  type TargetLanguage,
} from './translate.ts';

const CORS = {
  // Public, read-only event data: any origin may ask.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

const url = Deno.env.get('SUPABASE_URL') ?? '';
// Reads go through the public key, so row security decides what is published.
const publicDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
  auth: { persistSession: false },
});
// Only cache writes use the service role.
const serviceDb = createClient(
  url,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

const apiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
const translator = apiKey ? createGoogleTranslator({ apiKey, fetch }) : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const request = parseRequest(await req.json().catch(() => null));
  if (!request) return json(400, { error: 'invalid_request' });

  try {
    const result = await handleTranslate(
      {
        async loadEvent(id) {
          const { data, error } = await publicDb
            .from('events_public')
            .select('title, description')
            .eq('id', id)
            .eq('publication_status', 'published')
            .in('verification_state', [
              'source_confirmed',
              'organizer_confirmed',
            ])
            .maybeSingle();
          if (error) throw error;
          return data
            ? { title: data.title, description: data.description ?? '' }
            : null;
        },
        async readCache(eventId, locale: TargetLanguage, hashes) {
          const fields = Object.keys(hashes) as Field[];
          const { data, error } = await publicDb
            .from('event_translations')
            .select('field, content, content_hash')
            .eq('event_id', eventId)
            .eq('locale', locale)
            .in('field', fields);
          if (error) throw error;
          const found: Partial<Record<Field, string>> = {};
          for (const row of data ?? []) {
            const field = row.field as Field;
            if (hashes[field] === row.content_hash) found[field] = row.content;
          }
          return found;
        },
        async writeCache(rows) {
          const { error } = await serviceDb.from('event_translations').upsert(
            rows.map((row) => ({
              event_id: row.eventId,
              field: row.field,
              locale: row.locale,
              content: row.content,
              content_hash: row.contentHash,
              provider: row.provider,
            })),
            { onConflict: 'event_id,field,locale,content_hash' },
          );
          if (error) throw error;
        },
        translator,
      },
      request,
    );
    return json(result.status, result.body);
  } catch (error) {
    // No event text or keys in the log, only what failed.
    console.error('translate-event failed', (error as Error).message);
    return json(500, { error: 'internal' });
  }
});
