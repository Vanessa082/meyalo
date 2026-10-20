import type { Consent } from '../types/consent.type.ts';
import { consentProblem } from './consent.ts';

export interface PendingSignIn {
  email: string;
  consent: Consent;
  /** Where sign-in started, to return there. */
  from: 'welcome' | null;
}

/**
 * The email and consent between "Send me a code" and the code screen. Kept
 * in memory, never in the page address, so an email does not end up in
 * browser history. A reload starts sign-in again.
 */
export function createPendingSignIn() {
  let pending: PendingSignIn | null = null;
  return {
    set(next: PendingSignIn) {
      pending = consentProblem(next.consent) === null ? next : null;
    },
    get: () => pending,
    clear() {
      pending = null;
    },
  };
}

export const pendingSignIn = createPendingSignIn();
