import type { KeyValueStore } from '../services/key-value-store.ts';

/**
 * Storage for the sign-in session on phones (docs/product-decisions.md,
 * "Spec: accounts"). The session is sealed with a key kept in the phone's
 * secure storage, then written to ordinary storage: secure storage alone
 * rejects values above about 2 KB, and a session can be larger.
 *
 * Anything that cannot be opened (tampered, written before, key lost) reads
 * as signed out. It is never returned as a session.
 */
export interface SessionCipher {
  seal(plain: Uint8Array): Promise<string>;
  open(sealed: string): Promise<Uint8Array>;
}

export function createSealedStorage(
  data: KeyValueStore,
  cipher: () => Promise<SessionCipher>,
): KeyValueStore {
  return {
    async getItem(key) {
      const sealed = await data.getItem(key);
      if (sealed === null) return null;
      try {
        return fromUtf8(await (await cipher()).open(sealed));
      } catch {
        await data.removeItem(key).catch(() => {});
        return null;
      }
    },
    async setItem(key, value) {
      const sealed = await (await cipher()).seal(toUtf8(value));
      await data.setItem(key, sealed);
    },
    removeItem: (key) => data.removeItem(key),
  };
}

/** UTF-8 without relying on TextEncoder or TextDecoder being present. */
export function toUtf8(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    }
  }
  return new Uint8Array(bytes);
}

export function fromUtf8(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; ) {
    const byte = bytes[i] as number;
    const length = byte < 0x80 ? 1 : byte < 0xe0 ? 2 : byte < 0xf0 ? 3 : 4;
    let code = length === 1 ? byte : byte & (0xff >> (length + 1));
    for (let j = 1; j < length; j++) {
      const next = bytes[i + j];
      if (next === undefined || (next & 0xc0) !== 0x80) {
        throw new Error('Invalid UTF-8.');
      }
      code = (code << 6) | (next & 63);
    }
    text += String.fromCodePoint(code);
    i += length;
  }
  return text;
}
