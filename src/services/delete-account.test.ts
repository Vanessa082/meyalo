import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  type DeleteDeps,
  handleDelete,
} from '../../supabase/functions/delete-account/delete-account.ts';

const USER = 'a1000000-0000-4000-8000-00000000000a';

function deps(overrides: Partial<DeleteDeps> = {}) {
  const log: string[] = [];
  const base: DeleteDeps = {
    isCurator: async () => false,
    accountCreatedAt: async () => '2026-10-01T08:00:00Z',
    consentVersions: async () => ['2026-10-20'],
    hash: async () => 'ab'.repeat(32),
    writeRecord: async (record) => {
      log.push(`record:${record.user_hash.slice(0, 7)}:${record.source}`);
      return 'record-1';
    },
    removeRecord: async (id) => {
      log.push(`unrecord:${id}`);
    },
    deleteUser: async (id) => {
      log.push(`delete:${id}`);
    },
  };
  return { deps: { ...base, ...overrides }, log };
}

describe('delete account', () => {
  it('keeps an anonymous record, then deletes the user', async () => {
    const { deps: d, log } = deps();
    const result = await handleDelete(d, USER, 'app');
    assert.deepEqual(result, { status: 200, body: { deleted: true } });
    assert.deepEqual(log, ['record:abababa:app', `delete:${USER}`]);
  });

  it('records only the hash, never the id or email', async () => {
    let written: unknown;
    const { deps: d } = deps({
      writeRecord: async (record) => {
        written = record;
        return 'r';
      },
    });
    await handleDelete(d, USER, 'web');
    assert.equal(JSON.stringify(written).includes(USER), false);
    assert.deepEqual(written, {
      user_hash: 'ab'.repeat(32),
      account_created_at: '2026-10-01T08:00:00Z',
      consent_versions: ['2026-10-20'],
      source: 'web',
    });
  });

  it('refuses curator accounts, which an admin removes', async () => {
    const { deps: d, log } = deps({ isCurator: async () => true });
    const result = await handleDelete(d, USER, 'app');
    assert.equal(result.status, 409);
    assert.deepEqual(log, []);
  });

  it('takes the record back when the deletion fails, and says so', async () => {
    const { deps: d, log } = deps({
      deleteUser: async () => {
        throw new Error('auth down');
      },
    });
    const result = await handleDelete(d, USER, 'app');
    assert.equal(result.status, 500);
    assert.deepEqual(log, ['record:abababa:app', 'unrecord:record-1']);
  });
});
