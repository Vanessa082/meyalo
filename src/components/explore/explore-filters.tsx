import { SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { QUICK_PICK_CITIES } from '@/config/discovery/cities';
import { OFFER_IDS } from '@/config/discovery/offers';
import { TOPIC_IDS } from '@/config/discovery/topics';
import { useTheme } from '@/hooks/use-theme';
import type { TxKeyPath } from '@/i18n';
import { useTranslation } from '@/i18n/locale-provider';
import {
  activeFilterCount,
  DATE_PRESETS,
  type DatePreset,
  EMPTY_EXPLORE,
  type ExploreSort,
  type ExploreState,
  FORMATS,
  LANGUAGES,
  PRICES,
  type PriceFilter,
} from '@/services/explore-params';
import type { EventFormat } from '@/types/event.type';

const WHEN_LABELS: Record<DatePreset, TxKeyPath> = {
  today: 'explore.whenToday',
  weekend: 'explore.whenWeekend',
  week: 'explore.whenWeek',
};
const FORMAT_LABELS: Record<EventFormat, TxKeyPath> = {
  in_person: 'explore.formatInPerson',
  virtual: 'explore.formatOnline',
  hybrid: 'explore.formatHybrid',
};
const PRICE_LABELS: Record<PriceFilter, TxKeyPath> = {
  free: 'explore.free',
  paid: 'explore.paid',
};
const LANGUAGE_LABELS: Record<(typeof LANGUAGES)[number], TxKeyPath> = {
  en: 'common.languageEnglish',
  fr: 'common.languageFrench',
};

/** Adds or removes a value, keeping the order of `all`. */
function toggle<T>(values: readonly T[], value: T, all: readonly T[]): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : all.filter((item) => item === value || values.includes(item));
}

interface ExploreFiltersProps {
  state: ExploreState;
  /** Receives an update of the latest state, so quick taps never undo each
   *  other while the address catches up. */
  onChange: (update: (previous: ExploreState) => ExploreState) => void;
}

/**
 * Explore's filters (Feature 7): date, city, format and free always visible;
 * topic, offer, language, open registration and sort under "More filters".
 * Every change goes straight to the page address through `onChange`.
 */
export function ExploreFilters({ state, onChange }: ExploreFiltersProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const set = (patch: (previous: ExploreState) => Partial<ExploreState>) =>
    onChange((previous) => ({ ...previous, ...patch(previous) }));

  const moreCount = [
    state.topics.length > 0,
    state.offers.length > 0,
    state.languages.length > 0,
    state.open,
  ].filter(Boolean).length;
  // Opens by itself when the address already uses one of its filters.
  const [moreOpen, setMoreOpen] = useState(moreCount > 0);
  const active = activeFilterCount(state);

  const group = (label: TxKeyPath, chips: React.ReactNode) => (
    <Stack gap="xs">
      <Text variant="footnote" tone="muted">
        {t(label)}
      </Text>
      <Stack direction="row" gap="sm" wrap role="group" aria-label={t(label)}>
        {chips}
      </Stack>
    </Stack>
  );

  return (
    <Stack gap="md">
      {group(
        'explore.dateLabel',
        DATE_PRESETS.map((preset) => (
          <Chip
            key={preset}
            role="radio"
            label={t(WHEN_LABELS[preset])}
            selected={state.when === preset}
            onPress={() =>
              set((p) => ({ when: p.when === preset ? null : preset }))
            }
          />
        )),
      )}
      {group(
        'explore.cityLabel',
        QUICK_PICK_CITIES.map((city) => (
          <Chip
            key={city.id}
            label={city.name}
            selected={state.cities.includes(city.id)}
            onPress={() =>
              set((p) => ({
                cities: toggle(
                  p.cities,
                  city.id,
                  QUICK_PICK_CITIES.map((c) => c.id),
                ),
              }))
            }
          />
        )),
      )}
      {group(
        'explore.formatLabel',
        FORMATS.map((format) => (
          <Chip
            key={format}
            label={t(FORMAT_LABELS[format])}
            selected={state.formats.includes(format)}
            onPress={() =>
              set((p) => ({ formats: toggle(p.formats, format, FORMATS) }))
            }
          />
        )),
      )}
      {group(
        'explore.priceLabel',
        PRICES.map((price) => (
          <Chip
            key={price}
            label={t(PRICE_LABELS[price])}
            selected={state.prices.includes(price)}
            onPress={() =>
              set((p) => ({ prices: toggle(p.prices, price, PRICES) }))
            }
          />
        )),
      )}

      <Stack direction="row" gap="sm" align="center" wrap>
        <Button
          title={
            moreOpen
              ? t('explore.fewerFilters')
              : moreCount > 0
                ? t('explore.moreFiltersCount', { count: moreCount })
                : t('explore.moreFilters')
          }
          variant="ghost"
          size="small"
          icon={<SlidersHorizontal size={16} color={colors.primary} />}
          onPress={() => setMoreOpen((open) => !open)}
        />
        {active > 0 ? (
          <Button
            title={t('explore.clearAll')}
            variant="ghost"
            size="small"
            onPress={() => onChange((p) => ({ ...EMPTY_EXPLORE, q: p.q }))}
          />
        ) : null}
      </Stack>

      {moreOpen ? (
        <Stack gap="md">
          {group(
            'explore.topicsLabel',
            TOPIC_IDS.map((topic) => (
              <Chip
                key={topic}
                label={t(`topics.${topic}`)}
                selected={state.topics.includes(topic)}
                onPress={() =>
                  set((p) => ({ topics: toggle(p.topics, topic, TOPIC_IDS) }))
                }
              />
            )),
          )}
          {group(
            'explore.offersLabel',
            OFFER_IDS.map((offer) => (
              <Chip
                key={offer}
                label={t(`offers.${offer}`)}
                selected={state.offers.includes(offer)}
                onPress={() =>
                  set((p) => ({ offers: toggle(p.offers, offer, OFFER_IDS) }))
                }
              />
            )),
          )}
          {group('explore.languageLabel', [
            ...LANGUAGES.map((language) => (
              <Chip
                key={language}
                label={t(LANGUAGE_LABELS[language])}
                selected={state.languages.includes(language)}
                onPress={() =>
                  set((p) => ({
                    languages: toggle(p.languages, language, LANGUAGES),
                  }))
                }
              />
            )),
            <Chip
              key="open"
              label={t('explore.registrationOpen')}
              selected={state.open}
              onPress={() => set((p) => ({ open: !p.open }))}
            />,
          ])}
          <Stack gap="xs">
            <Text variant="footnote" tone="muted">
              {t('explore.sortLabel')}
            </Text>
            <SegmentedControl<ExploreSort>
              accessibilityLabel={t('explore.sortLabel')}
              value={state.sort}
              onChange={(sort) => set(() => ({ sort }))}
              options={[
                { value: 'soonest', label: t('explore.sortSoonest') },
                { value: 'recent', label: t('explore.sortRecent') },
              ]}
            />
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
