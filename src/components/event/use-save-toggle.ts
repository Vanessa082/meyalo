import { useToast } from '@/components/ui/toast';
import { useSavedEventIds, useSetEventSaved } from '@/hooks/use-saved-events';
import { useTranslation } from '@/i18n/locale-provider';
import type { EventCardData } from '@/types/event.type';

/** Save state of one event, with the failure toast every save button needs.
 *  Accepts no event while a screen is still loading it. */
export function useSaveToggle(event: EventCardData | null | undefined) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: savedIds = [] } = useSavedEventIds();
  const setSaved = useSetEventSaved();
  const isSaved = event ? savedIds.includes(event.id) : false;

  const save = (saved: boolean) => {
    if (!event) return;
    setSaved.mutate(
      { event, saved },
      {
        onError: () =>
          toast.show({
            tone: 'error',
            message: t('eventCard.saveFailed'),
            actionLabel: t('eventCard.retry'),
            onAction: () => save(saved),
          }),
      },
    );
  };

  return { isSaved, toggle: () => save(!isSaved) };
}
