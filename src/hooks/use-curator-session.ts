import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Curator sign-in for the console only. The role check here decides what the
 * console shows; the database decides what a session may read and write.
 */
export function useCuratorSession() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      queryClient.removeQueries({ queryKey: ['curation'] });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  const role = useQuery({
    queryKey: ['curation', 'role', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw new Error(error.message);
      return data === true;
    },
  });

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, []);

  return {
    ready,
    session,
    userId,
    isCurator: role.data === true,
    roleLoading: role.isLoading,
    roleError: role.error,
    retryRole: role.refetch,
    signIn,
    signOut,
  };
}
