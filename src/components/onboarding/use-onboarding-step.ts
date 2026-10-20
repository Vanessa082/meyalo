import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';

/** Back within onboarding; falls back to a fixed screen after a deep link. */
export function useOnboardingBack(fallback: Href) {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
