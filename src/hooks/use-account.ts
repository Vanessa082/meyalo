import type { Session } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { signInWithApple } from '@/lib/apple-sign-in';
import { supabase } from '@/lib/supabase';
import { account } from '@/services/account.service';
import type { Consent } from '@/types/consent.type';

export const SESSION_KEY = ['account', 'session'] as const;

/**
 * The signed-in account on this phone, or null for a guest. Kept current by
 * the auth listener; never persisted in the offline cache (persistence
 * policy keeps only public events).
 */
export function useAccountSession() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData<Session | null>(SESSION_KEY, session);
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);
  return useQuery<Session | null>({
    queryKey: SESSION_KEY,
    queryFn: async () => (await supabase.auth.getSession()).data.session,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSendCode() {
  return useMutation({
    mutationFn: (email: string) => account.sendCode(email),
  });
}

/** Signs in with the code, then records the consent shown before sending. */
export function useVerifyCode() {
  return useMutation({
    mutationFn: async (input: {
      email: string;
      code: string;
      consent: Consent;
    }) => {
      // A retry after the consent failed must not re-check a used code.
      const { data } = await supabase.auth.getSession();
      if (!data.session) await account.verifyCode(input.email, input.code);
      await account.recordConsent(input.consent);
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => account.signOut(),
    onSuccess: () => queryClient.setQueryData(SESSION_KEY, null),
  });
}

/** Deletes the account on the server, then signs out of this phone. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      account.deleteAccount(Platform.OS === 'web' ? 'web' : 'app'),
    onSuccess: () => queryClient.setQueryData(SESSION_KEY, null),
  });
}

/**
 * Sign in with Apple, then the same consent record as the email code. False
 * when the person closed Apple's sheet.
 */
export function useAppleSignIn() {
  return useMutation({
    mutationFn: async (consent: Consent): Promise<boolean> => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const credential = await signInWithApple();
        if (!credential) return false;
        await account.signInWithIdToken(
          'apple',
          credential.identityToken,
          credential.nonce,
        );
      }
      await account.recordConsent(consent);
      return true;
    },
  });
}
