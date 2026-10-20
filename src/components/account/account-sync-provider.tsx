import { onlineManager, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useToast } from '@/components/ui/toast';
import { SESSION_KEY, useAccountSession } from '@/hooks/use-account';
import { useTranslation } from '@/i18n/locale-provider';
import { supabase } from '@/lib/supabase';
import { isAccountError } from '@/services/account';
import { account } from '@/services/account.service';
import { syncAccount } from '@/services/account-sync';
import { DiscoveryProfileService } from '@/services/discovery-profile.service';
import { SavedEventsService } from '@/services/saved-events.service';

export type SyncState = 'off' | 'syncing' | 'synced' | 'waiting' | 'failed';

export interface SyncStatus {
  state: SyncState;
  /** When the server last confirmed a backup. */
  at: string | null;
}

const SyncContext = createContext<SyncStatus>({ state: 'off', at: null });

export function useSyncStatus(): SyncStatus {
  return useContext(SyncContext);
}

const SAVED_KEY = 'saved-events';
const PROFILE_KEY = 'discovery-profile';
const DEBOUNCE_MS = 2000;
const RETRY_MS = 60_000;

/**
 * Backs up plans and the profile while signed in (docs/product-decisions.md,
 * "Spec: accounts"): on sign-in, when the app comes back, when the network
 * returns, and 2 seconds after a change. One backup at a time; a change
 * during one queues another. "Backed up" is shown only after the server
 * answered.
 */
export function AccountSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  const { data: session } = useAccountSession();
  const userId = session?.user.id ?? null;
  const [status, setStatus] = useState<SyncStatus>({ state: 'off', at: null });

  const signedIn = useRef<string | null>(null);
  const running = useRef(false);
  const again = useRef(false);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What the last backup wrote, so writing it is not mistaken for a change.
  const written = useRef<Record<string, string>>({});

  const run = useCallback(async () => {
    if (!signedIn.current) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    if (retry.current) clearTimeout(retry.current);
    setStatus((current) => ({ ...current, state: 'syncing' }));
    try {
      const result = await syncAccount({
        account,
        saved: SavedEventsService,
        profiles: DiscoveryProfileService,
      });
      written.current = {
        [SAVED_KEY]: JSON.stringify(result.entries),
        [PROFILE_KEY]: JSON.stringify(result.profile),
      };
      queryClient.setQueryData([SAVED_KEY], result.entries);
      queryClient.setQueryData([PROFILE_KEY], result.profile);
      setStatus({ state: 'synced', at: new Date().toISOString() });
    } catch (error) {
      // Deleted on another phone: the server no longer knows this account.
      if (isAccountError(error) && error.kind === 'unauthorized') {
        const { error: gone } = await supabase.auth.getUser();
        if (gone) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          queryClient.setQueryData(SESSION_KEY, null);
          toast.show({ tone: 'info', message: t('you.accountGone') });
          return;
        }
      }
      // Nothing on the phone changed; try again later.
      setStatus((current) => ({ ...current, state: 'failed' }));
      retry.current = setTimeout(() => void run(), RETRY_MS);
    } finally {
      running.current = false;
      if (again.current) {
        again.current = false;
        void run();
      }
    }
  }, [queryClient, toast, t]);

  // Signing in (or another account) starts with a full merge.
  useEffect(() => {
    signedIn.current = userId;
    if (userId) void run();
    else setStatus({ state: 'off', at: null });
    return () => {
      if (retry.current) clearTimeout(retry.current);
    };
  }, [userId, run]);

  useEffect(() => {
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    const online = onlineManager.subscribe((isOnline) => {
      if (isOnline) void run();
    });
    return () => {
      appState.remove();
      online();
    };
  }, [run]);

  // A plan or profile change on this phone: back up shortly after.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey[0];
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      if (key !== SAVED_KEY && key !== PROFILE_KEY) return;
      if (!signedIn.current) return;
      if (JSON.stringify(event.query.state.data) === written.current[key]) {
        return;
      }
      setStatus((current) =>
        current.state === 'syncing'
          ? current
          : { ...current, state: 'waiting' },
      );
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void run(), DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [queryClient, run]);

  return <SyncContext.Provider value={status}>{children}</SyncContext.Provider>;
}
