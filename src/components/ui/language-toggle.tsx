import type { AppLanguage } from '@/i18n/language';
import { useAppLanguage, useTranslation } from '@/i18n/locale-provider';
import { SegmentedControl } from './segmented-control';

/** FR / EN switch. An explicit choice is persisted and overrides the device. */
export function LanguageToggle() {
  const { setExplicitLanguage } = useAppLanguage();
  const { t, language } = useTranslation();

  return (
    <SegmentedControl<AppLanguage>
      accessibilityLabel={t('common.language')}
      value={language}
      onChange={(next) => {
        void setExplicitLanguage(next);
      }}
      options={[
        {
          value: 'fr',
          label: 'FR',
          accessibilityLabel: t('common.languageFrench'),
        },
        {
          value: 'en',
          label: 'EN',
          accessibilityLabel: t('common.languageEnglish'),
        },
      ]}
    />
  );
}
