import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { EventValidationError } from '@/services/event-curation';
import {
  EVENT_FORMATS,
  FORMAT_LABELS,
  PRICE_TYPE_LABELS,
  PRICE_TYPES,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPES,
} from '@/services/event-domain';
import type { EventFieldErrors } from '@/services/event-validation';
import type { EventFormValues, EventTaxonomy } from '@/types/event.type';
import { Banner, Choices, describeError, Field, Section } from './console-ui';
import { VenueSearch } from './venue-search';

type TextField = Exclude<
  keyof EventFormValues,
  'topics' | 'offers' | 'languages'
>;
type ListField = 'topics' | 'offers' | 'languages';

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'French' },
  { value: 'en', label: 'English' },
] as const;

function humanize(id: string): string {
  return id.replace(/_/g, ' ');
}

interface EventFormProps {
  initialValues: EventFormValues;
  taxonomy: EventTaxonomy;
  submitLabel: string;
  submitting: boolean;
  /** Error from the last save attempt, if it failed. */
  saveError: unknown;
  onSubmit: (values: EventFormValues) => void;
  onCancel: () => void;
}

export function EventForm({
  initialValues,
  taxonomy,
  submitLabel,
  submitting,
  saveError,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [values, setValues] = useState(initialValues);

  const fieldErrors: EventFieldErrors =
    saveError instanceof EventValidationError ? saveError.fieldErrors : {};

  const text = (field: TextField) => ({
    value: values[field],
    onChangeText: (next: string) =>
      setValues((current) => ({ ...current, [field]: next })),
    error: fieldErrors[field],
  });

  const setChoice = (field: TextField) => (next: string) =>
    setValues((current) => ({
      ...current,
      [field]: current[field] === next ? '' : next,
    }));

  const toggleList = (field: ListField) => (next: string) =>
    setValues((current) => ({
      ...current,
      [field]: current[field].includes(next)
        ? current[field].filter((item) => item !== next)
        : [...current[field], next],
    }));

  const languageOptions = [
    ...LANGUAGE_OPTIONS,
    ...values.languages
      .filter(
        (code) => !LANGUAGE_OPTIONS.some((option) => option.value === code),
      )
      .map((code) => ({ value: code, label: code })),
  ];

  return (
    <View style={styles.form}>
      {saveError ? (
        <Banner
          tone="error"
          message={`Not saved. The stored event was not changed. ${describeError(saveError)}`}
        />
      ) : null}

      <Banner
        tone="info"
        message="Only events that promote growth: they build skills, livelihoods, health, opportunity or community. Arts, sport and faith events qualify when they have that angle (a music workshop, a youth sport development day, a church entrepreneurship conference). Not parties or nightlife."
      />

      <Section title="Event">
        <Field label="Title" {...text('title')} />
        <Field
          label="Description"
          multiline
          autoCapitalize="sentences"
          {...text('description')}
        />
        <Field
          label="Category"
          hint="As shown to people, e.g. Business & Finance."
          autoCapitalize="sentences"
          {...text('category')}
        />
        <Choices
          label="Format"
          options={EVENT_FORMATS.map((value) => ({
            value,
            label: FORMAT_LABELS[value],
          }))}
          selected={[values.format]}
          onToggle={setChoice('format')}
          error={fieldErrors.format}
        />
        <Field
          label="Organizer"
          autoCapitalize="words"
          {...text('organizerName')}
        />
      </Section>

      <Section title="When">
        <Field
          label="Timezone"
          hint="IANA name, e.g. Africa/Douala. Times below are in this timezone."
          {...text('timezone')}
        />
        <Field
          label="Starts"
          placeholder="YYYY-MM-DD HH:mm"
          {...text('startAt')}
        />
        <Field
          label="Ends (optional)"
          placeholder="YYYY-MM-DD HH:mm"
          {...text('endAt')}
        />
        <Field
          label="Registration closes (optional)"
          placeholder="YYYY-MM-DD HH:mm"
          {...text('registrationDeadline')}
        />
      </Section>

      <Section title="Where">
        <Field label="City" autoCapitalize="words" {...text('city')} />
        <Field
          label="Country code"
          placeholder="CM"
          autoCapitalize="characters"
          {...text('countryCode')}
        />
        <Field
          label="Venue (optional)"
          autoCapitalize="words"
          {...text('venueName')}
        />
        <Field label="Address (optional)" {...text('address')} />
        <VenueSearch
          suggestedQuery={[values.venueName, values.address, values.city]
            .map((part) => part.trim())
            .filter(Boolean)
            .join(', ')}
          onPick={(place) =>
            setValues((current) => ({
              ...current,
              latitude: place.latitude.toFixed(6),
              longitude: place.longitude.toFixed(6),
            }))
          }
        />
        <Field label="Latitude (optional)" {...text('latitude')} />
        <Field label="Longitude (optional)" {...text('longitude')} />
        <Field
          label="Online access (optional)"
          hint="e.g. Zoom link sent after registration."
          {...text('virtualAccessType')}
        />
      </Section>

      <Section title="Source">
        <Field
          label="Source link"
          placeholder="https://"
          keyboardType="url"
          {...text('sourceUrl')}
        />
        <Choices
          label="Source type"
          options={SOURCE_TYPES.map((value) => ({
            value,
            label: SOURCE_TYPE_LABELS[value],
          }))}
          selected={[values.sourceType]}
          onToggle={setChoice('sourceType')}
          error={fieldErrors.sourceType}
        />
        <Field
          label="Registration link (optional)"
          placeholder="https://"
          keyboardType="url"
          {...text('registrationUrl')}
        />
      </Section>

      <Section title="Price">
        <Choices
          label="Price"
          options={PRICE_TYPES.map((value) => ({
            value,
            label: PRICE_TYPE_LABELS[value],
          }))}
          selected={[values.priceType]}
          onToggle={setChoice('priceType')}
          error={fieldErrors.priceType}
        />
        <Field label="Minimum amount (optional)" {...text('priceMin')} />
        <Field label="Maximum amount (optional)" {...text('priceMax')} />
        <Field
          label="Currency (with an amount)"
          placeholder="XAF"
          autoCapitalize="characters"
          {...text('currency')}
        />
      </Section>

      <Section title="Classification">
        <Choices
          label="Event languages"
          options={languageOptions}
          selected={values.languages}
          onToggle={toggleList('languages')}
          error={fieldErrors.languages}
        />
        <Choices
          label="Topics"
          options={taxonomy.topics.map((value) => ({
            value,
            label: humanize(value),
          }))}
          selected={values.topics}
          onToggle={toggleList('topics')}
          error={fieldErrors.topics}
        />
        <Choices
          label="What it offers"
          options={taxonomy.offers.map((value) => ({
            value,
            label: humanize(value),
          }))}
          selected={values.offers}
          onToggle={toggleList('offers')}
          error={fieldErrors.offers}
        />
      </Section>

      <View style={styles.actions}>
        <Button
          title={submitLabel}
          loading={submitting}
          onPress={() => onSubmit(values)}
        />
        <Button
          title="Cancel"
          variant="ghost"
          disabled={submitting}
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
});
