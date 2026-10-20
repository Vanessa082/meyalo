import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { memoryStore } from '../services/key-value-store.ts';
import {
  createSealedStorage,
  fromUtf8,
  type SessionCipher,
  toUtf8,
} from './sealed-storage.ts';

/** A stand-in cipher: reversible, and refuses anything it did not seal. */
const fakeCipher: SessionCipher = {
  async seal(plain) {
    return `sealed:${Buffer.from(plain).toString('base64')}`;
  },
  async open(sealed) {
    if (!sealed.startsWith('sealed:')) throw new Error('tampered');
    return new Uint8Array(Buffer.from(sealed.slice(7), 'base64'));
  },
};

describe('sealed session storage', () => {
  it('stores only sealed text and reads the original back', async () => {
    const data = memoryStore();
    const storage = createSealedStorage(data, async () => fakeCipher);
    await storage.setItem('sb-auth', '{"access_token":"t","user":"Ãé😀"}');
    assert.ok(data.data.get('sb-auth')?.startsWith('sealed:'));
    assert.ok(!data.data.get('sb-auth')?.includes('access_token'));
    assert.equal(
      await storage.getItem('sb-auth'),
      '{"access_token":"t","user":"Ãé😀"}',
    );
  });

  it('reads tampered or unreadable data as signed out, and removes it', async () => {
    const data = memoryStore({ 'sb-auth': 'plain text session' });
    const storage = createSealedStorage(data, async () => fakeCipher);
    assert.equal(await storage.getItem('sb-auth'), null);
    assert.equal(data.data.has('sb-auth'), false);
  });

  it('reads as signed out when the key cannot be loaded', async () => {
    const data = memoryStore({ 'sb-auth': 'sealed:e30=' });
    const storage = createSealedStorage(data, async () => {
      throw new Error('keychain locked');
    });
    assert.equal(await storage.getItem('sb-auth'), null);
  });

  it('fails loudly when a session cannot be sealed', async () => {
    const storage = createSealedStorage(memoryStore(), async () => ({
      ...fakeCipher,
      seal: async () => {
        throw new Error('no key');
      },
    }));
    await assert.rejects(storage.setItem('sb-auth', '{}'));
  });

  it('removes and reports missing values as null', async () => {
    const data = memoryStore();
    const storage = createSealedStorage(data, async () => fakeCipher);
    assert.equal(await storage.getItem('sb-auth'), null);
    await storage.setItem('sb-auth', '{}');
    await storage.removeItem('sb-auth');
    assert.equal(data.data.has('sb-auth'), false);
  });
});

describe('utf-8', () => {
  it('round-trips every kind of character', () => {
    const text = 'a é ẞ 中 😀 \u0000';
    assert.deepEqual(toUtf8(text), new Uint8Array(Buffer.from(text, 'utf8')));
    assert.equal(fromUtf8(toUtf8(text)), text);
  });
});
