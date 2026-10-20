import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consent } from '../types/consent.type.ts';
import { consentColumns, consentProblem } from './consent.ts';
import type { RemotePlan, RemoteProfile, SyncPlan } from './plan-sync.ts';

/**
 * Optional accounts (docs/product-decisions.md, "Spec: accounts"): sign-in
 * with a 6-digit email code, the consent record, and the backup call.
 * Sign-in with Apple and Google come behind the same service later.
 */

export type AccountErrorKind =
  | 'invalid_input'
  | 'rate_limited'
  | 'wrong_code'
  | 'unauthorized'
  | 'curator'
  | 'unavailable';

export class AccountError extends Error {
  readonly kind: AccountErrorKind;

  constructor(kind: AccountErrorKind, message: string) {
    super(message);
    this.name = 'AccountError';
    this.kind = kind;
  }
}

export function isAccountError(error: unknown): error is AccountError {
  return error instanceof AccountError;
}

export interface AccountSnapshot {
  plans: RemotePlan[];
  profile: RemoteProfile | null;
}

/** Practical, not RFC 5322: something@something.tld, at most 254 characters. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX = 254;

interface ErrorLike {
  status?: number;
  code?: string;
  message?: string;
}

function classify(error: ErrorLike, fallback: string): AccountError {
  if (
    error.status === 429 ||
    error.code === 'over_email_send_rate_limit' ||
    error.code === 'over_request_rate_limit' ||
    error.code === 'PT429'
  ) {
    return new AccountError('rate_limited', 'Too many attempts.');
  }
  if (error.code === 'otp_expired' || error.status === 403) {
    return new AccountError('wrong_code', 'The code is wrong or expired.');
  }
  if (error.code === '42501' || error.status === 401) {
    return new AccountError('unauthorized', error.message ?? 'Not allowed.');
  }
  if (error.code === 'email_address_invalid' || error.code?.startsWith('22')) {
    return new AccountError('invalid_input', error.message ?? 'Invalid input.');
  }
  return new AccountError('unavailable', error.message ?? fallback);
}

async function run<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isAccountError(error)) throw error;
    throw new AccountError(
      'unavailable',
      error instanceof Error ? error.message : 'Request failed.',
    );
  }
}

export function normalizeEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  return value.length <= EMAIL_MAX && EMAIL.test(value) ? value : null;
}

export function createAccountService(client: SupabaseClient) {
  return {
    /** Sends a 6-digit code; creates the account on first use. */
    async sendCode(email: string): Promise<void> {
      const address = normalizeEmail(email);
      if (!address) {
        throw new AccountError('invalid_input', 'Enter a valid email.');
      }
      return run(async () => {
        const { error } = await client.auth.signInWithOtp({
          email: address,
          options: { shouldCreateUser: true },
        });
        if (error) throw classify(error, 'The code could not be sent.');
      });
    },

    /** Signs in with the code. Only a returned session counts. */
    async verifyCode(email: string, code: string): Promise<void> {
      const address = normalizeEmail(email);
      const token = code.replace(/\s/g, '');
      if (!address || !/^\d{6}$/.test(token)) {
        throw new AccountError('invalid_input', 'Enter the 6-digit code.');
      }
      return run(async () => {
        const { data, error } = await client.auth.verifyOtp({
          email: address,
          token,
          type: 'email',
        });
        if (error) throw classify(error, 'The code could not be checked.');
        if (!data?.session) {
          throw new AccountError('wrong_code', 'The code is wrong or expired.');
        }
      });
    },

    /**
     * Native sign-in (Apple now, Google later): the provider's identity
     * token, and the raw nonce whose hash the provider signed.
     */
    async signInWithIdToken(
      provider: 'apple' | 'google',
      token: string,
      nonce: string,
    ): Promise<void> {
      if (!token) {
        throw new AccountError('invalid_input', 'No identity token.');
      }
      return run(async () => {
        const { data, error } = await client.auth.signInWithIdToken({
          provider,
          token,
          nonce,
        });
        if (error) throw classify(error, 'Sign-in failed.');
        if (!data?.session) {
          throw new AccountError('unauthorized', 'Sign-in was not accepted.');
        }
      });
    },

    /** The consent shown at sign-in, recorded before anything is backed up. */
    async recordConsent(consent: Consent): Promise<void> {
      if (consentProblem(consent)) {
        throw new AccountError('invalid_input', 'Consent is incomplete.');
      }
      return run(async () => {
        const { error } = await client
          .from('account_consents')
          .insert(consentColumns(consent));
        if (error) throw classify(error, 'Consent could not be recorded.');
      });
    },

    /** This phone only: other phones stay signed in. */
    async signOut(): Promise<void> {
      return run(async () => {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw classify(error, 'Could not sign out.');
      });
    },

    /**
     * Deletes the account on the server (supabase/functions/delete-account),
     * then signs out of this phone. Plans on the phone stay. Nothing is
     * reported as deleted until the server confirmed it.
     */
    async deleteAccount(source: 'app' | 'web'): Promise<void> {
      return run(async () => {
        const { data, error } = await client.functions.invoke(
          'delete-account',
          { body: { source } },
        );
        if (error) {
          const response = (error as { context?: unknown }).context;
          if (response instanceof Response && response.status === 409) {
            throw new AccountError(
              'curator',
              'Curator accounts are removed by an admin.',
            );
          }
          throw new AccountError('unavailable', 'The account was not deleted.');
        }
        if ((data as { deleted?: unknown } | null)?.deleted !== true) {
          throw new AccountError('unavailable', 'The account was not deleted.');
        }
        await client.auth.signOut({ scope: 'local' });
      });
    },

    /** Sends changes; answers with everything the account holds. */
    async sync(
      plans: readonly SyncPlan[],
      profile: { discovery: unknown; updated_at: string } | null,
    ): Promise<AccountSnapshot> {
      return run(async () => {
        const { data, error } = await client.rpc('sync_account', {
          p_plans: plans,
          p_profile: profile,
        });
        if (error) throw classify(error, 'Backup failed.');
        const value = data as Partial<AccountSnapshot> | null;
        if (!value || !Array.isArray(value.plans)) {
          throw new AccountError('unavailable', 'The backup answer is empty.');
        }
        return { plans: value.plans, profile: value.profile ?? null };
      });
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
