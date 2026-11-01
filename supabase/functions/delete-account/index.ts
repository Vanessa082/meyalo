// Deno entry for delete-account. The logic lives in delete-account.ts,
// tested with Node; this file only wires it to Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleDelete, parseSource } from './delete-account.ts';

const CORS = {
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

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // The account to delete is the caller's, read from their verified token.
  // Nothing in the request body can name another account.
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'unauthorized' });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json(401, { error: 'unauthorized' });
  const user = auth.user;

  try {
    const result = await handleDelete(
      {
        async isCurator(id) {
          const { data, error } = await admin
            .from('user_roles')
            .select('role')
            .eq('user_id', id)
            .eq('role', 'admin')
            .maybeSingle();
          if (error) throw error;
          return data !== null;
        },
        accountCreatedAt: async () => user.created_at ?? null,
        async consentVersions(id) {
          const { data, error } = await admin
            .from('account_consents')
            .select('consent_version')
            .eq('user_id', id);
          if (error) throw error;
          return [...new Set((data ?? []).map((row) => row.consent_version))];
        },
        hash: sha256,
        async writeRecord(record) {
          const { data, error } = await admin
            .from('account_deletions')
            .insert(record)
            .select('id')
            .single();
          if (error) throw error;
          return data.id as string;
        },
        async removeRecord(id) {
          await admin.from('account_deletions').delete().eq('id', id);
        },
        async deleteUser(id) {
          const { error } = await admin.auth.admin.deleteUser(id);
          if (error) throw error;
        },
      },
      user.id,
      parseSource(await req.json().catch(() => null)),
    );
    return json(result.status, result.body);
  } catch {
    // No detail to the client; nothing personal in logs.
    return json(500, { error: 'failed' });
  }
});
