import { useCallback, useState } from 'react';

/** Multi-select state that keeps the order in which items were picked. */
export function useSelection<T>(initial: readonly T[]) {
  const [selected, setSelected] = useState<T[]>(() => [...initial]);
  const toggle = useCallback((item: T) => {
    setSelected((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
    );
  }, []);
  return { selected, toggle, isSelected: (item: T) => selected.includes(item) };
}
