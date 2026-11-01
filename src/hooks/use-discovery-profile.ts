import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DiscoveryProfileService } from '@/services/discovery-profile.service';
import type {
  DiscoveryProfilePatch,
  LocalDiscoveryProfile,
} from '@/types/discovery-profile';

const PROFILE_QUERY = ['discovery-profile'] as const;
const ENTRY_QUERY = ['app-entry'] as const;

export function useDiscoveryProfile() {
  return useQuery<LocalDiscoveryProfile | null>({
    queryKey: PROFILE_QUERY,
    queryFn: () => DiscoveryProfileService.load(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

export function useUpdateDiscoveryProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: DiscoveryProfilePatch) =>
      DiscoveryProfileService.update(patch),
    onSuccess: (profile) => queryClient.setQueryData(PROFILE_QUERY, profile),
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: DiscoveryProfilePatch) => {
      await DiscoveryProfileService.update(patch);
      return DiscoveryProfileService.complete();
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY, profile);
      queryClient.setQueryData(ENTRY_QUERY, true);
    },
  });
}

export function useHasEnteredApp() {
  return useQuery<boolean>({
    queryKey: ENTRY_QUERY,
    queryFn: () => DiscoveryProfileService.hasEntered(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

export function useMarkEnteredApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => DiscoveryProfileService.markEntered(),
    onSuccess: () => queryClient.setQueryData(ENTRY_QUERY, true),
  });
}

/** Clears the on-device profile; screens re-read it. */
export function useResetDiscoveryProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => DiscoveryProfileService.clear(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROFILE_QUERY }),
  });
}
