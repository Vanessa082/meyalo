import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';
import {
  ChoiceGroup,
  OnboardingStep,
} from '@/components/onboarding/onboarding-step';
import { useOnboardingBack } from '@/components/onboarding/use-onboarding-step';
import { Chip } from '@/components/ui/chip';
import { SearchInput } from '@/components/ui/search-input';
import { Text } from '@/components/ui/text';
import {
  type City,
  isQuickPickCity,
  QUICK_PICK_CITIES,
  searchCities,
} from '@/config/discovery/cities';
import {
  useDiscoveryProfile,
  useUpdateDiscoveryProfile,
} from '@/hooks/use-discovery-profile';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { Duration, Radius, Spacing, TouchTargets } from '@/theme';
import type {
  DiscoveryArea,
  FormatPreference,
  LocalDiscoveryProfile,
} from '@/types/discovery-profile';

const MAX_RESULTS = 6;
const reveal = FadeIn.duration(Duration.state);
const hide = FadeOut.duration(Duration.press);
const settle = LinearTransition.duration(Duration.state);

export default function WhereAndHowScreen() {
  const { data: profile, isPending } = useDiscoveryProfile();
  if (isPending) return null;
  return <WhereAndHowStep profile={profile ?? null} />;
}

function WhereAndHowStep({
  profile,
}: {
  profile: LocalDiscoveryProfile | null;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const onBack = useOnboardingBack('/(onboarding)/welcome');
  const update = useUpdateDiscoveryProfile();
  const searchRef = useRef<TextInput>(null);

  const [area, setArea] = useState<DiscoveryArea | null>(profile?.area ?? null);
  const [format, setFormat] = useState<FormatPreference | null>(
    profile?.format ?? null,
  );
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const otherCity =
    area?.kind === 'city' && !isQuickPickCity(area.city.id) ? area.city : null;
  const onlineOnly = area?.kind === 'online_only';
  const results = useMemo(
    () => searchCities(query).slice(0, MAX_RESULTS),
    [query],
  );

  const chooseArea = (next: DiscoveryArea) => {
    setArea(next);
    setSearching(false);
    setQuery('');
  };

  const startSearch = () => {
    setArea(null);
    setSearching(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const pickCity = (city: City) => {
    searchRef.current?.blur();
    chooseArea({ kind: 'city', city });
  };

  const advance = () => {
    update.mutate(
      { area, format: onlineOnly ? null : format },
      { onSuccess: () => router.push('/(onboarding)/interests') },
    );
  };

  const formats: { value: FormatPreference; label: string }[] = [
    { value: 'in_person', label: t('onboarding.formatInPerson') },
    { value: 'online', label: t('onboarding.formatOnline') },
    { value: 'both', label: t('onboarding.formatBoth') },
  ];

  return (
    <OnboardingStep
      step={1}
      title={t('onboarding.whereTitle')}
      subtitle={t('onboarding.whereSubtitle')}
      hasSelection={area !== null || format !== null}
      onAdvance={advance}
      saving={update.isPending}
      saveError={update.isError}
      onBack={onBack}
      footnote={t('onboarding.privacy')}
    >
      <ChoiceGroup single label={t('onboarding.cityLabel')}>
        {QUICK_PICK_CITIES.map((city) => (
          <Chip
            key={city.id}
            role="radio"
            label={city.name}
            selected={area?.kind === 'city' && area.city.id === city.id}
            onPress={() => chooseArea({ kind: 'city', city })}
          />
        ))}
        <Chip
          role="radio"
          label={otherCity?.name ?? t('onboarding.otherCity')}
          selected={searching || otherCity !== null}
          onPress={startSearch}
          testID="city-other"
        />
        <Chip
          role="radio"
          label={t('onboarding.onlineOnly')}
          selected={onlineOnly}
          onPress={() => chooseArea({ kind: 'online_only' })}
        />
      </ChoiceGroup>

      {searching ? (
        <Animated.View entering={reveal} exiting={hide} style={styles.search}>
          <SearchInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={t('onboarding.citySearchLabel')}
            placeholder={t('onboarding.citySearchPlaceholder')}
            clearLabel={t('common.clear')}
            autoCapitalize="words"
            onSubmitEditing={() => {
              if (results[0]) pickCity(results[0]);
            }}
            testID="city-search"
          />
          {query.trim() ? (
            results.length > 0 ? (
              <CityResults results={results} onPick={pickCity} />
            ) : (
              <Text
                variant="callout"
                tone="muted"
                accessibilityLiveRegion="polite"
              >
                {t('onboarding.cityNoMatch', { query: query.trim() })}
              </Text>
            )
          ) : null}
        </Animated.View>
      ) : null}

      <LayoutAnimationConfig skipEntering>
        {onlineOnly ? null : (
          <Animated.View entering={reveal} exiting={hide} layout={settle}>
            <ChoiceGroup single label={t('onboarding.formatLabel')}>
              {formats.map((option) => (
                <Chip
                  key={option.value}
                  role="radio"
                  label={option.label}
                  selected={format === option.value}
                  onPress={() => setFormat(option.value)}
                />
              ))}
            </ChoiceGroup>
          </Animated.View>
        )}
      </LayoutAnimationConfig>
    </OnboardingStep>
  );
}

function CityResults({
  results,
  onPick,
}: {
  results: City[];
  onPick: (city: City) => void;
}) {
  const colors = useTheme();
  return (
    <View
      accessibilityRole="list"
      style={[
        styles.results,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      {results.map((city, index) => (
        <Pressable
          key={city.id}
          accessibilityRole="button"
          onPress={() => onPick(city)}
          style={({ pressed }) => [
            styles.result,
            index > 0 && {
              borderTopColor: colors.borderSubtle,
              borderTopWidth: StyleSheet.hairlineWidth,
            },
            pressed && { backgroundColor: colors.surfaceSunken },
          ]}
        >
          <Text variant="body">{city.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    gap: Spacing.sm,
    marginTop: -Spacing.md,
  },
  results: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  result: {
    minHeight: TouchTargets.recommended,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
