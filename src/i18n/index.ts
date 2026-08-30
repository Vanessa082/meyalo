import en from './messages/en.json';
import fr from './messages/fr.json';

export type Language = 'en' | 'fr';

const translations = { en, fr };

export function t(
  key:
    | 'tabs.forYou'
    | 'tabs.explore'
    | 'tabs.aroundYou'
    | 'tabs.month'
    | 'tabs.you',
  lang: Language = 'en',
): string {
  const [section, field] = key.split('.') as ['tabs', keyof typeof en.tabs];
  return (
    translations[lang]?.[section]?.[field] ?? translations.en[section][field]
  );
}
