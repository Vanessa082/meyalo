import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consent } from '../types/consent.type.ts';
import { AccountError, createAccountService } from './account.ts';

const EMAIL = 'amina@example.com';
const consent: Consent = {
  version: '2026-10-20',
  language: 'fr',
  ageGroup: '18_plus',
  guardianConsent: false,
};

function fakeClient(answers: Record<string, unknown> = {}) {
  const calls: { name: string; args: unknown }[] = [];
  const answer = (name: string) =>
    (answers[name] as object) ?? { data: {}, error: null };
  const client = {
    auth: {
      signInWithOtp: async (args: unknown) => {
        calls.push({ name: 'signInWithOtp', args });
        return answer('signInWithOtp');
      },
      verifyOtp: async (args: unknown) => {
        calls.push({ name: 'verifyOtp', args });
        return answer('verifyOtp');
      },
      signInWithIdToken: async (args: unknown) => {
        calls.push({ name: 'signInWithIdToken', args });
        return answer('signInWithIdToken');
      },
      signOut: async (args: unknown) => {
        calls.push({ name: 'signOut', args });
        return answer('signOut');
      },
    },
    from: (table: string) => ({
      insert: async (args: unknown) => {
        calls.push({ name: `insert:${table}`, args });
        return answer(`insert:${table}`);
      },
    }),
    functions: {
      invoke: async (fn: string, args: unknown) => {
        calls.push({ name: `fn:${fn}`, args });
        return answer(`fn:${fn}`);
      },
    },
    rpc: async (fn: string, args: unknown) => {
      calls.push({ name: `rpc:${fn}`, args });
      return answer(`rpc:${fn}`);
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const isKind = (kind: AccountError['kind']) => (error: unknown) =>
  error instanceof AccountError && error.kind === kind;

describe('email code sign-in', () => {
  it('sends a code to a trimmed, lower-case email', async () => {
    const { client, calls } = fakeClient();
    await createAccountService(client).sendCode('  Amina@Example.com ');
    assert.deepEqual(calls, [
      {
        name: 'signInWithOtp',
        args: { email: EMAIL, options: { shouldCreateUser: true } },
      },
    ]);
  });

  it('refuses an address that is not an email before the network', async () => {
    const { client, calls } = fakeClient();
    for (const bad of ['', 'amina', 'a@b', `${'x'.repeat(250)}@ex.com`]) {
      await assert.rejects(
        createAccountService(client).sendCode(bad),
        isKind('invalid_input'),
      );
    }
    assert.equal(calls.length, 0);
  });

  it('says when too many codes were asked for, or the network is down', async () => {
    const limited = fakeClient({
      signInWithOtp: {
        error: {
          status: 429,
          code: 'over_email_send_rate_limit',
          message: 'x',
        },
      },
    });
    await assert.rejects(
      createAccountService(limited.client).sendCode(EMAIL),
      isKind('rate_limited'),
    );
    const offline = fakeClient({
      signInWithOtp: { error: { status: 0, message: 'Failed to fetch' } },
    });
    await assert.rejects(
      createAccountService(offline.client).sendCode(EMAIL),
      isKind('unavailable'),
    );
  });

  it('checks the 6-digit code and reports a wrong or expired one', async () => {
    const { client, calls } = fakeClient({
      verifyOtp: { data: { session: { access_token: 't' } }, error: null },
    });
    await createAccountService(client).verifyCode(EMAIL, ' 123 456 ');
    assert.deepEqual(calls.at(-1), {
      name: 'verifyOtp',
      args: { email: EMAIL, token: '123456', type: 'email' },
    });
    await assert.rejects(
      createAccountService(client).verifyCode(EMAIL, '12345'),
      isKind('invalid_input'),
    );
    const wrong = fakeClient({
      verifyOtp: { error: { status: 403, code: 'otp_expired', message: 'x' } },
    });
    await assert.rejects(
      createAccountService(wrong.client).verifyCode(EMAIL, '123456'),
      isKind('wrong_code'),
    );
  });

  it('is not signed in without a session, even without an error', async () => {
    const { client } = fakeClient({
      verifyOtp: { data: { session: null }, error: null },
    });
    await assert.rejects(
      createAccountService(client).verifyCode(EMAIL, '123456'),
      isKind('wrong_code'),
    );
  });
});

describe('consent and sign out', () => {
  it('records the consent with its columns', async () => {
    const { client, calls } = fakeClient();
    await createAccountService(client).recordConsent(consent);
    assert.deepEqual(calls, [
      {
        name: 'insert:account_consents',
        args: {
          consent_version: '2026-10-20',
          consent_language: 'fr',
          age_group: '18_plus',
          guardian_consent: null,
        },
      },
    ]);
  });

  it('refuses incomplete consent before the network', async () => {
    const { client, calls } = fakeClient();
    await assert.rejects(
      createAccountService(client).recordConsent({
        ...consent,
        ageGroup: 'under_18',
      }),
      isKind('invalid_input'),
    );
    assert.equal(calls.length, 0);
  });

  it('signs out of this phone only', async () => {
    const { client, calls } = fakeClient();
    await createAccountService(client).signOut();
    assert.deepEqual(calls, [{ name: 'signOut', args: { scope: 'local' } }]);
  });
});

describe('backup', () => {
  it('sends plans and profile and returns what the account holds', async () => {
    const held = { plans: [], profile: { discovery: null, updated_at: null } };
    const { client, calls } = fakeClient({
      'rpc:sync_account': { data: held, error: null },
    });
    const result = await createAccountService(client).sync([], null);
    assert.deepEqual(result, held);
    assert.deepEqual(calls, [
      { name: 'rpc:sync_account', args: { p_plans: [], p_profile: null } },
    ]);
  });

  it('fails loudly when the server refuses or answers nothing', async () => {
    const refused = fakeClient({
      'rpc:sync_account': {
        data: null,
        error: { code: '42501', message: 'no consent' },
      },
    });
    await assert.rejects(
      createAccountService(refused.client).sync([], null),
      isKind('unauthorized'),
    );
    const empty = fakeClient({
      'rpc:sync_account': { data: null, error: null },
    });
    await assert.rejects(
      createAccountService(empty.client).sync([], null),
      isKind('unavailable'),
    );
  });
});

describe('deleting the account', () => {
  it('asks the server to delete, then signs out of this phone', async () => {
    const { client, calls } = fakeClient({
      'fn:delete-account': { data: { deleted: true }, error: null },
    });
    await createAccountService(client).deleteAccount('app');
    assert.deepEqual(calls, [
      { name: 'fn:delete-account', args: { body: { source: 'app' } } },
      { name: 'signOut', args: { scope: 'local' } },
    ]);
  });

  it('says when a curator account must be removed by an admin', async () => {
    const { client, calls } = fakeClient({
      'fn:delete-account': {
        data: null,
        error: {
          context: new Response('{"error":"curator"}', { status: 409 }),
        },
      },
    });
    await assert.rejects(
      createAccountService(client).deleteAccount('app'),
      isKind('curator'),
    );
    assert.equal(
      calls.some((c) => c.name === 'signOut'),
      false,
    );
  });

  it('never reports a deletion the server did not confirm', async () => {
    for (const answer of [
      { data: null, error: { message: 'Failed to fetch' } },
      { data: { deleted: false }, error: null },
    ]) {
      const { client, calls } = fakeClient({ 'fn:delete-account': answer });
      await assert.rejects(
        createAccountService(client).deleteAccount('app'),
        isKind('unavailable'),
      );
      assert.equal(
        calls.some((c) => c.name === 'signOut'),
        false,
      );
    }
  });
});

describe('sign in with a provider', () => {
  it('passes the identity token and the raw nonce to the server', async () => {
    const { client, calls } = fakeClient({
      signInWithIdToken: {
        data: { session: { access_token: 't' } },
        error: null,
      },
    });
    await createAccountService(client).signInWithIdToken(
      'apple',
      'id-token',
      'raw-nonce',
    );
    assert.deepEqual(calls, [
      {
        name: 'signInWithIdToken',
        args: { provider: 'apple', token: 'id-token', nonce: 'raw-nonce' },
      },
    ]);
  });

  it('is not signed in without a session or a token', async () => {
    const empty = fakeClient({
      signInWithIdToken: { data: { session: null }, error: null },
    });
    await assert.rejects(
      createAccountService(empty.client).signInWithIdToken(
        'apple',
        'id-token',
        'n',
      ),
      isKind('unauthorized'),
    );
    await assert.rejects(
      createAccountService(empty.client).signInWithIdToken('apple', '', 'n'),
      isKind('invalid_input'),
    );
  });
});
