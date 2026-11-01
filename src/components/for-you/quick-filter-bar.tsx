import { Chip } from '@/components/ui/chip';
import { Stack } from '@/components/ui/stack';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import { QUICK_FILTERS, type QuickFilter } from '@/services/quick-filters';

const LABELS: Record<QuickFilter, TxKeyPath> = {
  weekend: 'forYou.filterWeekend',
  free: 'forYou.filterFree',
  online: 'forYou.filterOnline',
  closingSoon: 'forYou.filterClosingSoon',
};

interface QuickFilterBarProps {
  selected: readonly QuickFilter[];
  onChange: (next: QuickFilter[]) => void;
}

/** The For You quick chips. Several can be on; events must match all. */
export function QuickFilterBar({ selected, onChange }: QuickFilterBarProps) {
  const { t } = useTranslation();

  const toggle = (filter: QuickFilter) =>
    onChange(
      selected.includes(filter)
        ? selected.filter((item) => item !== filter)
        : // Kept in display order, whatever order they were tapped in.
          QUICK_FILTERS.filter(
            (item) => item === filter || selected.includes(item),
          ),
    );

  return (
    <Stack
      direction="row"
      gap="sm"
      wrap
      role="group"
      aria-label={t('forYou.filtersLabel')}
    >
      {QUICK_FILTERS.map((filter) => (
        <Chip
          key={filter}
          label={t(LABELS[filter])}
          selected={selected.includes(filter)}
          onPress={() => toggle(filter)}
        />
      ))}
    </Stack>
  );
}
