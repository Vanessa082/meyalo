import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consent } from '../types/consent.type.ts';
import { createSupplyService, SupplyError } from './supply.ts';

const ID = '1f6c6fa9-ce6f-4848-bc92-13723ff49dca';
const TOKEN = '7d3b0e1c-2f4a-4c6b-9d8e-0a1b2c3d4e5f';

const untouchable = new Proxy(
  {},
  {
    get() {
      throw new Error('The service should have rejected this input first.');
    },
  },
) as SupabaseClient;

function rpcClient(answer: { data: unknown; error: unknown }) {
  const calls: { fn: string; args: unknown }[] = [];
  const client = {
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return answer;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const consent: Consent = {
  version: '2026-10-19',
  language: 'en',
  ageGroup: 'under_18',
  guardianConsent: true,
};

const isKind = (kind: SupplyError['kind']) => (error: unknown) =>
  error instanceof SupplyError && error.kind === kind;

describe('submit', () => {
  it('needs a link or a description, and links must be https', async () => {
    const supply = createSupplyService(untouchable);
    await assert.rejects(
      supply.submit({ sourceUrl: '', description: ' ', note: 'hi', consent }),
      isKind('invalid_input'),
    );
    await assert.rejects(
      supply.submit({
        sourceUrl: 'http://x.example',
        description: '',
        note: '',
        consent,
      }),
      isKind('invalid_input'),
    );
    await assert.rejects(
      supply.submit({
        sourceUrl: '',
        description: 'x'.repeat(5001),
        note: '',
        consent,
      }),
      isKind('invalid_input'),
    );
  });

  it('needs complete consent, with a guardian under 18', async () => {
    const supply = createSupplyService(untouchable);
    await assert.rejects(
      supply.submit({
        sourceUrl: '',
        description: 'Agri fair',
        note: '',
        consent: { ...consent, guardianConsent: false },
      }),
      isKind('invalid_input'),
    );
    await assert.rejects(
      supply.submit({
        sourceUrl: '',
        description: 'Agri fair',
        note: '',
        consent: undefined as never,
      }),
      isKind('invalid_input'),
    );
  });

  it('sends trimmed values and returns the id and status token', async () => {
    const { client, calls } = rpcClient({
      data: [{ id: ID, access_token: TOKEN }],
      error: null,
    });
    const result = await createSupplyService(client).submit({
      sourceUrl: ' https://church.example/notice ',
      description: '',
      note: '  Youth entrepreneurship day  ',
      consent,
    });
    assert.deepEqual(result, { id: ID, token: TOKEN });
    assert.deepEqual(calls, [
      {
        fn: 'submit_event',
        args: {
          p_source_url: 'https://church.example/notice',
          p_raw_text: null,
          p_note: 'Youth entrepreneurship day',
          p_consent_version: '2026-10-19',
          p_consent_language: 'en',
          p_age_group: 'under_18',
          p_guardian_consent: true,
        },
      },
    ]);
  });

  it('says so when the hourly cap is reached', async () => {
    const { client } = rpcClient({
      data: null,
      error: { code: 'PT429', message: 'too many' },
    });
    await assert.rejects(
      createSupplyService(client).submit({
        sourceUrl: '',
        description: 'Agri fair',
        note: '',
        consent,
      }),
      isKind('rate_limited'),
    );
  });
});

describe('status', () => {
  it('returns the status, or null for a wrong link', async () => {
    const found = rpcClient({
      data: [{ status: 'not_added', decision_reason: 'Already listed' }],
      error: null,
    });
    assert.deepEqual(
      await createSupplyService(found.client).status(ID, TOKEN),
      {
        status: 'not_added',
        reason: 'Already listed',
      },
    );
    const missing = rpcClient({ data: [], error: null });
    assert.equal(
      await createSupplyService(missing.client).status(ID, TOKEN),
      null,
    );
  });

  it('rejects malformed ids before the network', async () => {
    await assert.rejects(
      createSupplyService(untouchable).status('nope', TOKEN),
      isKind('invalid_input'),
    );
  });
});

describe('coverage grid', () => {
  it('fills every city and topic, with zero where nothing is upcoming', async () => {
    const { client } = rpcClient({
      data: [{ city: 'Buea', topic_id: 'technology', upcoming: 3 }],
      error: null,
    });
    const grid = await createSupplyService(client).coverage(
      ['Buea', 'Bamenda'],
      ['technology', 'agriculture'],
    );
    assert.deepEqual(grid, {
      cities: ['Buea', 'Bamenda'],
      topics: ['technology', 'agriculture'],
      counts: {
        Buea: { technology: 3, agriculture: 0 },
        Bamenda: { technology: 0, agriculture: 0 },
      },
    });
  });
});

describe('decide', () => {
  function updateClient(rows: unknown[]) {
    const calls: unknown[] = [];
    const client = {
      from: () => ({
        update: (payload: unknown) => {
          calls.push(payload);
          return {
            eq: () => ({ select: async () => ({ data: rows, error: null }) }),
          };
        },
      }),
    } as unknown as SupabaseClient;
    return { client, calls };
  }

  it('needs a reason to decline and an event id to accept', async () => {
    const supply = createSupplyService(untouchable);
    await assert.rejects(
      supply.decide(ID, { status: 'not_added', reason: '  ' }),
      isKind('invalid_input'),
    );
    await assert.rejects(
      supply.decide(ID, { status: 'published', eventId: 'nope' }),
      isKind('invalid_input'),
    );
  });

  it('writes the decision the submitter will see', async () => {
    const { client, calls } = updateClient([{ id: ID }]);
    await createSupplyService(client).decide(ID, {
      status: 'not_added',
      reason: ' Not a growth event ',
    });
    assert.deepEqual(calls, [
      {
        status: 'not_added',
        decision_reason: 'Not a growth event',
        published_event_id: null,
      },
    ]);
  });

  it('fails loudly when nothing was updated', async () => {
    const { client } = updateClient([]);
    await assert.rejects(
      createSupplyService(client).decide(ID, {
        status: 'published',
        eventId: TOKEN,
      }),
      isKind('unauthorized'),
    );
  });
});
