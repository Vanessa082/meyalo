import { useIsOnline } from '@/hooks/use-online';
import { formatTimeAgo } from '@/i18n/format';
import { useTranslation } from '@/i18n/locale-provider';
import { InlineMessage } from './inline-message';

interface OfflineNoticeProps {
  /** `dataUpdatedAt` of the query on screen; 0 when nothing was ever loaded. */
  updatedAt: number;
}

/** Says plainly that the screen shows saved data, and how old it is. */
export function OfflineNotice({ updatedAt }: OfflineNoticeProps) {
  const online = useIsOnline();
  const { t, language } = useTranslation();
  if (online) return null;

  return (
    <InlineMessage
      tone="warning"
      message={
        updatedAt > 0
          ? t('offline.showingSaved', {
              time: formatTimeAgo(new Date(updatedAt), new Date(), language),
            })
          : t('offline.nothingSaved')
      }
    />
  );
}
