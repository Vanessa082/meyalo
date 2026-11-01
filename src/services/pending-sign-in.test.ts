import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPendingSignIn } from './pending-sign-in.ts';

const consent = {
  version: '2026-10-20',
  language: 'en',
  ageGroup: '18_plus',
  guardianConsent: false,
} as const;

describe('pending sign-in', () => {
  it('holds the email and consent between the two screens, in memory', () => {
    const pending = createPendingSignIn();
    assert.equal(pending.get(), null);
    pending.set({ email: 'amina@example.com', consent, from: 'welcome' });
    assert.equal(pending.get()?.email, 'amina@example.com');
    pending.clear();
    assert.equal(pending.get(), null);
  });

  it('refuses an incomplete consent, so the code screen starts again', () => {
    const pending = createPendingSignIn();
    pending.set({
      email: 'amina@example.com',
      consent: { ...consent, ageGroup: 'under_18' },
      from: null,
    });
    assert.equal(pending.get(), null);
  });
});
