import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consent } from '../types/consent.type.ts';
import { createFriendPlans, FriendPlanError } from './friend-plans.ts';

const EVENT = 'e3000000-0000-4000-8000-000000000001';
const TOKEN = '7d3b0e1c-2f4a-4c6b-9d8e-0a1b2c3d4e5f';
const ANSWER = '1f6c6fa9-ce6f-4848-bc92-13723ff49dca';
const consent: Consent = {
  version: '2026-10-20',
  language: 'fr',
  ageGroup: '18_plus',
  guardianConsent: false,
};

function fakeClient(answers: Record<string, unknown> = {}) {
  const calls: { name: string; args: unknown }[] = [];
  const answer = (name: string) =>
    (answers[name] as object) ?? { data: null, error: null };
  const client = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ name: fn, args });
      return answer(fn);
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const isKind = (kind: FriendPlanError['kind']) => (error: unknown) =>
  error instanceof FriendPlanError && error.kind === kind;

describe('creating a plan', () => {
  it('sends the event, a trimmed name and the visibility choice', async () => {
    const { client, calls } = fakeClient({
      create_friend_plan: {
        data: [{ id: 'p1', token: TOKEN, expires_at: '2026-11-02T10:00:00Z' }],
        error: null,
      },
    });
    const plan = await createFriendPlans(client).create(
      EVENT,
      '  Amina ',
      true,
    );
    assert.equal(plan.token, TOKEN);
    assert.deepEqual(calls, [
      {
        name: 'create_friend_plan',
        args: { p_event_id: EVENT, p_owner_name: 'Amina', p_show_names: true },
      },
    ]);
  });

  it('says when sign-in is needed, a plan exists, or too many were made', async () => {
    const cases: [object, FriendPlanError['kind']][] = [
      [{ code: '42501', message: 'x' }, 'not_signed_in'],
      [{ code: '23505', message: 'x' }, 'exists'],
      [{ code: 'PT429', message: 'x' }, 'rate_limited'],
    ];
    for (const [error, kind] of cases) {
      const { client } = fakeClient({
        create_friend_plan: { data: null, error },
      });
      await assert.rejects(
        createFriendPlans(client).create(EVENT, '', false),
        isKind(kind),
      );
    }
  });
});

describe('answering', () => {
  it('answers with consent columns and keeps the returned answer token', async () => {
    const { client, calls } = fakeClient({
      respond_to_friend_plan: { data: ANSWER, error: null },
    });
    const token = await createFriendPlans(client).respond(TOKEN, {
      firstName: ' Bello ',
      answer: 'in',
      consent,
      responseToken: null,
    });
    assert.equal(token, ANSWER);
    assert.deepEqual(calls[0]?.args, {
      p_token: TOKEN,
      p_first_name: 'Bello',
      p_answer: 'in',
      p_consent_version: '2026-10-20',
      p_consent_language: 'fr',
      p_age_group: '18_plus',
      p_guardian_consent: null,
      p_response_token: null,
    });
  });

  it('refuses a missing name, a wrong link or incomplete consent before the network', async () => {
    const { client, calls } = fakeClient();
    const plans = createFriendPlans(client);
    const base = {
      firstName: 'Bello',
      answer: 'in' as const,
      consent,
      responseToken: null,
    };
    await assert.rejects(
      plans.respond(TOKEN, { ...base, firstName: ' ' }),
      isKind('invalid'),
    );
    await assert.rejects(plans.respond('nope', base), isKind('invalid'));
    await assert.rejects(
      plans.respond(TOKEN, {
        ...base,
        consent: { ...consent, ageGroup: 'under_18' },
      }),
      isKind('invalid'),
    );
    assert.equal(calls.length, 0);
  });

  it('says when the plan no longer takes answers', async () => {
    const { client } = fakeClient({
      respond_to_friend_plan: {
        data: null,
        error: { code: '22023', message: 'x' },
      },
    });
    await assert.rejects(
      createFriendPlans(client).respond(TOKEN, {
        firstName: 'Bello',
        answer: 'in',
        consent,
        responseToken: null,
      }),
      isKind('invalid'),
    );
  });
});

describe('the public view', () => {
  it('reads the plan, or null for an unknown or expired link', async () => {
    const view = {
      title: 'DevFest',
      status: 'open',
      counts: { in: 1, maybe: 0, cant: 0 },
    };
    const found = fakeClient({ get_friend_plan: { data: view, error: null } });
    assert.deepEqual(
      await createFriendPlans(found.client).getPublic(TOKEN),
      view,
    );
    const missing = fakeClient({
      get_friend_plan: { data: null, error: null },
    });
    assert.equal(
      await createFriendPlans(missing.client).getPublic(TOKEN),
      null,
    );
    assert.equal(
      await createFriendPlans(missing.client).getPublic('nope'),
      null,
    );
  });

  it('removes one’s own answer', async () => {
    const { client, calls } = fakeClient({
      remove_friend_plan_response: { data: true, error: null },
    });
    assert.equal(await createFriendPlans(client).withdraw(TOKEN, ANSWER), true);
    assert.deepEqual(calls[0]?.args, {
      p_token: TOKEN,
      p_response_token: ANSWER,
    });
  });
});
