import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUICK_PICK_CITIES } from '@/config/discovery/cities';
import { TOPIC_IDS } from '@/config/discovery/topics';
import type { SubmissionInput, SubmissionStatus } from '@/services/supply';
import { supply } from '@/services/supply.service';

export function useSubmitEvent() {
  return useMutation({
    mutationFn: (input: SubmissionInput) => supply.submit(input),
  });
}

export function useSubmissionStatus(id: string, token: string) {
  return useQuery({
    queryKey: ['submission-status', id],
    queryFn: () => supply.status(id, token),
    enabled: Boolean(id && token),
  });
}

// Curator queries live under 'curation' so they are never persisted.
const submissionsKey = (status: SubmissionStatus) =>
  ['curation', 'submissions', status] as const;

export function useSubmissions(status: SubmissionStatus) {
  return useQuery({
    queryKey: submissionsKey(status),
    queryFn: () => supply.listSubmissions(status),
  });
}

export function useDecideSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: Parameters<typeof supply.decide>[1];
    }) => supply.decide(id, decision),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['curation', 'submissions'] }),
  });
}

/** Launch cities plus online, against the full topic list. */
export const COVERAGE_CITIES = [
  ...QUICK_PICK_CITIES.map((city) => city.name),
  'Online',
];

export function useCoverage() {
  return useQuery({
    queryKey: ['curation', 'coverage'],
    queryFn: () => supply.coverage(COVERAGE_CITIES, TOPIC_IDS),
  });
}
