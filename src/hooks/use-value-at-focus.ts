import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The value as it was when the screen last came into focus. Lets a list keep
 * its order while the user acts on it; changes apply on the next visit. A
 * value that was still loading at focus is taken as soon as it arrives.
 */
export function useValueAtFocus<T>(value: T | undefined): T | undefined {
  const latest = useRef(value);
  latest.current = value;
  const [held, setHeld] = useState(value);

  useFocusEffect(
    useCallback(() => {
      setHeld(latest.current);
    }, []),
  );

  useEffect(() => {
    if (held === undefined && value !== undefined) setHeld(value);
  }, [held, value]);

  return held;
}
