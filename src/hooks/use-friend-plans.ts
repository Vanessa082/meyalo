import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type FriendResponseInput,
  isFriendPlanError,
} from '@/services/friend-plans';
import { friendPlans } from '@/services/friend-plans.service';

const ownKey = (eventId: string) => ['friend-plan', 'own', eventId] as const;
const publicKey = (token: string) => ['friend-plan', 'public', token] as const;

/** The owner's plan for this event, with every answer. Signed in only. */
export function useOwnFriendPlan(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: ownKey(eventId),
    queryFn: () => friendPlans.listForEvent(eventId),
    enabled,
  });
}

export function useCreateFriendPlan(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ownerName: string; showNames: boolean }) =>
      friendPlans.create(eventId, input.ownerName, input.showNames),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ownKey(eventId) }),
  });
}

export function useUpdateFriendPlan(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planId: string;
      change: { closed?: boolean; show_names?: boolean };
    }) => friendPlans.update(input.planId, input.change),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ownKey(eventId) }),
  });
}

export function useDeleteFriendPlan(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => friendPlans.remove(planId),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ownKey(eventId) }),
  });
}

/** What a friend with the link sees. */
export function usePublicFriendPlan(token: string) {
  return useQuery({
    queryKey: publicKey(token),
    queryFn: () => friendPlans.getPublic(token),
    enabled: token !== '',
    retry: (count, error) => !isFriendPlanError(error) && count < 2,
  });
}

export function useRespondToFriendPlan(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FriendResponseInput) =>
      friendPlans.respond(token, input),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: publicKey(token) }),
  });
}

export function useWithdrawFriendAnswer(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (responseToken: string) =>
      friendPlans.withdraw(token, responseToken),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: publicKey(token) }),
  });
}
