/**
 * Development fixture: a curator and a non-curator account on the LOCAL
 * Supabase stack, for signing in to /console. Not seed data; refuses to run
 * against any non-local URL.
 *
 *   eval "$(pnpm dlx supabase status -o env)"
 *   SUPABASE_URL=$API_URL SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
 *     pnpm curator:local
 *
 * Accounts: curator@meyalo.local and member@meyalo.local. The password is
 * LOCAL_ACCOUNT_PASSWORD, or "local-dev-password" when unset.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const password = process.env.LOCAL_ACCOUNT_PASSWORD || 'local-dev-password';

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url)) {
  console.error('Refusing to create accounts on a non-local Supabase URL.');
  process.exit(1);
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureUser(email) {
  const { data, error } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((user) => user.email === email);
  if (existing) {
    const updated = await service.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updated.error) throw updated.error;
    return existing.id;
  }
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

const curatorId = await ensureUser('curator@meyalo.local');
const role = await service
  .from('user_roles')
  .upsert(
    { user_id: curatorId, role: 'admin' },
    { onConflict: 'user_id,role' },
  );
if (role.error) throw role.error;

const memberId = await ensureUser('member@meyalo.local');
const removed = await service
  .from('user_roles')
  .delete()
  .eq('user_id', memberId);
if (removed.error) throw removed.error;

console.log(
  'Local accounts ready: curator@meyalo.local (curator), member@meyalo.local (no role).',
);
