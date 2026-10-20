/**
 * Row Level Security boundaries.
 *
 * Requires a Supabase database with migrations applied:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *
 * The service-role key bypasses RLS and is used only to arrange fixtures
 * and to read rows the client is not allowed to read. It must never ship
 * in the app.
 */

import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    'Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const createdUserIds = [];

function client() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email) {
  const password = 'Rls-test-password-1';
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  createdUserIds.push(created.data.user.id);
  const user = client();
  const session = await user.auth.signInWithPassword({ email, password });
  if (session.error) throw session.error;
  return { user, id: created.data.user.id };
}

async function main() {
  const organizer = await admin
    .from('organizers')
    .select('id')
    .limit(1)
    .single();
  if (organizer.error) throw organizer.error;

  const published = await admin
    .from('events')
    .insert({
      title: `rls-published-${stamp}`,
      description: 'RLS fixture',
      format: 'in_person',
      category: 'Test',
      start_at: new Date(Date.now() + 86_400_000).toISOString(),
      city: 'Yaoundé',
      country_code: 'CM',
      organizer_name: 'RLS Fixture',
      organizer_id: organizer.data.id,
      source_url: `https://example.com/rls-published-${stamp}`,
      source_type: 'organizer_site',
      publication_status: 'published',
      verification_state: 'source_confirmed',
    })
    .select('id')
    .single();
  if (published.error) throw published.error;

  const draft = await admin
    .from('events')
    .insert({
      title: `rls-draft-${stamp}`,
      description: 'RLS fixture',
      format: 'in_person',
      category: 'Test',
      start_at: new Date(Date.now() + 86_400_000).toISOString(),
      city: 'Yaoundé',
      country_code: 'CM',
      organizer_name: 'RLS Fixture',
      organizer_id: organizer.data.id,
      source_url: `https://example.com/rls-draft-${stamp}`,
      source_type: 'organizer_site',
      publication_status: 'draft',
      verification_state: 'unreviewed',
    })
    .select('id')
    .single();
  if (draft.error) throw draft.error;

  const illegal = await admin.from('events').insert({
    title: `rls-illegal-${stamp}`,
    description: 'Must fail',
    format: 'in_person',
    category: 'Test',
    start_at: new Date(Date.now() + 86_400_000).toISOString(),
    organizer_name: 'RLS Fixture',
    organizer_id: organizer.data.id,
    source_url: `https://example.com/rls-illegal-${stamp}`,
    source_type: 'organizer_site',
    publication_status: 'published',
    verification_state: 'unreviewed',
  });
  assert.ok(illegal.error, 'published + unreviewed must be rejected');

  const visible = await anon
    .from('events')
    .select('id')
    .eq('id', published.data.id);
  assert.equal(visible.data?.length, 1, 'anon sees published reviewed events');

  const hidden = await anon.from('events').select('id').eq('id', draft.data.id);
  assert.equal(hidden.data?.length, 0, 'anon does not see drafts');

  const anonWrite = await anon
    .from('events')
    .update({ title: 'hacked' })
    .eq('id', published.data.id);
  assert.ok(anonWrite.error, 'anon cannot update events');

  const userA = await signIn(`rls-a-${stamp}@meyalo.test`);
  const userB = await signIn(`rls-b-${stamp}@meyalo.test`);

  const selfAdmin = await userA.user
    .from('user_roles')
    .insert({ user_id: userA.id, role: 'admin' });
  assert.ok(selfAdmin.error, 'a user cannot grant themselves admin');

  const otherProfile = await userA.user
    .from('profiles')
    .select('id')
    .eq('id', userB.id);
  assert.equal(otherProfile.data?.length, 0, 'profiles are isolated');

  const renameOther = await userA.user
    .from('profiles')
    .update({ display_name: 'hacked' })
    .eq('id', userB.id);
  assert.equal(renameOther.error, null);
  const profileB = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', userB.id)
    .single();
  assert.equal(
    profileB.data.display_name,
    null,
    'cross-user profile update is a no-op',
  );

  const planA = await userA.user.from('plans').insert({
    user_id: userB.id,
    event_id: published.data.id,
    state: 'saved',
  });
  assert.equal(planA.error, null, 'saving a plan succeeds');
  const stolen = await userB.user
    .from('plans')
    .select('id')
    .eq('event_id', published.data.id);
  assert.equal(
    stolen.data?.length,
    0,
    'the plan stays with the writer, not the forged user id',
  );
  const ownPlan = await userA.user
    .from('plans')
    .select('user_id')
    .eq('event_id', published.data.id)
    .single();
  assert.equal(ownPlan.data.user_id, userA.id);

  // Accounts (013): nothing is backed up before consent, consent is the
  // caller's own, a backup returns only the caller's plans.
  const consentRow = {
    consent_version: '2026-10-20',
    consent_language: 'en',
    age_group: '18_plus',
  };
  const early = await userB.user.rpc('sync_account', {
    p_plans: [],
    p_profile: null,
  });
  assert.ok(early.error, 'no backup before consent');
  const forged = await userB.user
    .from('account_consents')
    .insert({ ...consentRow, user_id: userA.id });
  assert.ok(forged.error, 'no consent for someone else');
  for (const who of [userA, userB]) {
    const own = await who.user.from('account_consents').insert(consentRow);
    assert.equal(own.error, null, 'a person records their own consent');
  }
  const backupB = await userB.user.rpc('sync_account', {
    p_plans: [
      {
        event_id: published.data.id,
        state: 'going',
        state_changed_at: new Date().toISOString(),
      },
    ],
    p_profile: null,
  });
  assert.equal(backupB.error, null, 'a backup succeeds after consent');
  const backupA = await userA.user.rpc('sync_account', {
    p_plans: [],
    p_profile: null,
  });
  assert.equal(backupA.error, null);
  assert.equal(
    backupA.data.plans.length,
    1,
    "a backup returns only the caller's plans",
  );
  assert.equal(backupA.data.plans[0].state, 'saved');
  const anonBackup = await anon.rpc('sync_account', {
    p_plans: [],
    p_profile: null,
  });
  assert.ok(anonBackup.error, 'anon cannot back up');
  const records = await userA.user.from('account_deletions').select('id');
  assert.ok(records.error, 'users cannot read deletion records');

  // Plans with friends (015): the owner creates, friends answer through the
  // token only, nobody else reads names.
  const friendPlan = await userA.user.rpc('create_friend_plan', {
    p_event_id: published.data.id,
    p_owner_name: 'Amina',
    p_show_names: false,
  });
  assert.equal(friendPlan.error, null, 'a signed-in owner creates a plan');
  const planToken = friendPlan.data[0].token;
  const answered = await anon.rpc('respond_to_friend_plan', {
    p_token: planToken,
    p_first_name: 'Bello',
    p_answer: 'in',
    p_consent_version: '2026-10-20',
    p_consent_language: 'en',
    p_age_group: '18_plus',
    p_guardian_consent: null,
    p_response_token: null,
  });
  assert.equal(answered.error, null, 'a friend answers without an account');
  const seen = await anon.rpc('get_friend_plan', { p_token: planToken });
  assert.equal(seen.data.counts.in, 1);
  assert.equal(seen.data.names, undefined, 'a private plan shows no names');
  const anonRead = await anon
    .from('friend_plan_responses')
    .select('first_name');
  assert.ok(anonRead.error, 'anon cannot read answers directly');
  const otherRead = await userB.user
    .from('friend_plan_responses')
    .select('first_name');
  assert.equal(otherRead.data?.length ?? 0, 0, 'another user reads no answers');
  const ownerRead = await userA.user
    .from('friend_plan_responses')
    .select('first_name');
  assert.equal(
    ownerRead.data?.[0]?.first_name,
    'Bello',
    'the owner reads the names',
  );

  const nonAdminEdit = await userB.user
    .from('events')
    .update({ title: 'changed by user' })
    .eq('id', published.data.id)
    .select('id');
  assert.equal(nonAdminEdit.data?.length ?? 0, 0);
  const title = await admin
    .from('events')
    .select('title')
    .eq('id', published.data.id)
    .single();
  assert.equal(title.data.title, `rls-published-${stamp}`);

  const unconsented = await anon.from('reports').insert({
    event_id: published.data.id,
    reason: 'scam',
    note: 'rls',
  });
  assert.ok(unconsented.error, 'a report without consent is refused');
  const report = await anon.from('reports').insert({
    event_id: published.data.id,
    reason: 'scam',
    note: 'rls',
    consent_version: '2026-10-19',
    consent_language: 'en',
    age_group: '18_plus',
  });
  assert.equal(report.error, null, 'anon can file a report with consent');
  const reportRead = await anon.from('reports').select('id');
  assert.ok(reportRead.error, 'anon cannot read reports');
  const reportByUser = await userB.user.from('reports').select('id');
  assert.equal(
    reportByUser.data?.length,
    0,
    'a normal user cannot read reports',
  );

  const feedback = await anon.from('feedback').insert({
    category: 'bug',
    message: 'rls feedback',
    user_id: userA.id,
  });
  assert.equal(feedback.error, null);
  const feedbackRow = await admin
    .from('feedback')
    .select('user_id')
    .eq('message', 'rls feedback')
    .single();
  assert.equal(
    feedbackRow.data.user_id,
    null,
    'anon feedback cannot claim a user id',
  );
  const feedbackRead = await userB.user.from('feedback').select('id');
  assert.equal(feedbackRead.data?.length, 0);

  const submission = await anon.from('submissions').insert({
    source_url: `https://example.com/rls-submission-${stamp}`,
    status: 'published',
    decision_reason: 'forged',
    submitter_user_id: userA.id,
  });
  assert.equal(submission.error, null);
  const stored = await admin
    .from('submissions')
    .select('id, access_token, status, decision_reason, submitter_user_id')
    .eq('source_url', `https://example.com/rls-submission-${stamp}`)
    .single();
  assert.equal(stored.data.status, 'under_review');
  assert.equal(stored.data.decision_reason, null);
  assert.equal(stored.data.submitter_user_id, null);

  const status = await anon.rpc('get_submission_status', {
    submission_id: stored.data.id,
    submission_token: stored.data.access_token,
  });
  assert.equal(status.data?.[0]?.status, 'under_review');
  const wrongToken = await anon.rpc('get_submission_status', {
    submission_id: stored.data.id,
    submission_token: '00000000-0000-0000-0000-000000000000',
  });
  assert.equal(wrongToken.data?.length ?? 0, 0);

  const submissionUpdate = await userB.user
    .from('submissions')
    .update({ status: 'published' })
    .eq('id', stored.data.id);
  assert.equal(submissionUpdate.error, null);
  const still = await admin
    .from('submissions')
    .select('status')
    .eq('id', stored.data.id)
    .single();
  assert.equal(
    still.data.status,
    'under_review',
    'clients cannot publish a submission',
  );

  const translation = await admin.from('event_translations').insert({
    event_id: draft.data.id,
    field: 'title',
    locale: 'fr',
    content: 'brouillon',
    content_hash: `rls-${stamp}`,
    provider: 'test',
  });
  assert.equal(translation.error, null);
  const leaked = await anon
    .from('event_translations')
    .select('content')
    .eq('event_id', draft.data.id);
  assert.equal(leaked.data?.length, 0, 'draft translations are not public');

  const promoted = await admin.from('user_roles').insert({
    user_id: userA.id,
    role: 'admin',
  });
  assert.equal(promoted.error, null);
  const adminSeesDraft = await userA.user
    .from('events')
    .select('id')
    .eq('id', draft.data.id);
  assert.equal(adminSeesDraft.data?.length, 1, 'admin can read drafts');

  const directPlan = await userA.user
    .from('friend_plans')
    .insert({ owner_user_id: userA.id, event_id: published.data.id });
  assert.ok(
    directPlan.error,
    'plans are created only through create_friend_plan',
  );
  const missing = await anon.rpc('get_friend_plan', {
    p_token: '00000000-0000-4000-8000-000000000000',
  });
  assert.equal(missing.data, null, 'an unknown plan token finds nothing');

  console.log('RLS boundary tests passed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const fixtures = await admin
      .from('events')
      .select('id')
      .like('source_url', `%${stamp}%`);
    const eventIds = (fixtures.data ?? []).map((row) => row.id);
    if (eventIds.length > 0) {
      const plans = await admin
        .from('friend_plans')
        .select('id')
        .in('event_id', eventIds);
      const planIds = (plans.data ?? []).map((row) => row.id);
      if (planIds.length > 0) {
        await admin
          .from('friend_plan_responses')
          .delete()
          .in('friend_plan_id', planIds);
        await admin.from('friend_plans').delete().in('id', planIds);
      }
      await admin.from('plans').delete().in('event_id', eventIds);
      await admin.from('reports').delete().in('event_id', eventIds);
      await admin.from('event_translations').delete().in('event_id', eventIds);
      await admin.from('events').delete().in('id', eventIds);
    }
    await admin.from('submissions').delete().like('source_url', `%${stamp}%`);
    await admin.from('feedback').delete().eq('message', 'rls feedback');
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });
