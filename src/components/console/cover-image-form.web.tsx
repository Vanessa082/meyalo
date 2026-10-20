import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/text';
import { useRemoveCoverImage, useSetCoverImage } from '@/hooks/use-curation';
import { useTheme } from '@/hooks/use-theme';
import { resizeToWebp } from '@/lib/resize-image';
import {
  COVER_IMAGE_RIGHTS,
  COVER_IMAGE_RIGHTS_LABELS,
  COVER_IMAGE_WIDTHS,
  type CoverImageRights,
  coverImageInputProblem,
} from '@/services/cover-image';
import { Radius } from '@/theme';
import type { Event } from '@/types/event.type';
import { Banner, Choices, describeError, Field } from './console-ui';

const RIGHTS = COVER_IMAGE_RIGHTS.map((value) => ({
  value,
  label: COVER_IMAGE_RIGHTS_LABELS[value],
}));

/**
 * Add, replace or remove the event's image (docs/product-decisions.md,
 * "Spec: event images"). The right to use it and alt text come first; the
 * browser resizes to 640 and 1600 px WebP before anything is uploaded.
 */
export function CoverImageForm({ event }: { event: Event }) {
  const colors = useTheme();
  const setImage = useSetCoverImage(event);
  const removeImage = useRemoveCoverImage(event);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rights, setRights] = useState<CoverImageRights | null>(null);
  const [alt, setAlt] = useState('');
  const [credit, setCredit] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const choose = (picked: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(picked);
    setPreview(picked ? URL.createObjectURL(picked) : null);
    setProblem(null);
  };

  const upload = async () => {
    const input = { rights, alt, credit: credit.trim() || null };
    const found = !file
      ? 'Choose an image first.'
      : coverImageInputProblem(input);
    setProblem(found);
    if (found || !file) return;
    setWorking(true);
    try {
      const [small, large] = await Promise.all([
        resizeToWebp(file, COVER_IMAGE_WIDTHS.small),
        resizeToWebp(file, COVER_IMAGE_WIDTHS.large),
      ]);
      await setImage.mutateAsync({ images: { small, large }, input });
      choose(null);
      setRights(null);
      setAlt('');
      setCredit('');
    } catch (error) {
      setProblem(describeError(error));
    } finally {
      setWorking(false);
    }
  };

  const current = event.coverImage;
  const shown = preview ?? current?.largeUrl ?? null;

  return (
    <Stack gap="md">
      {shown ? (
        <View style={[styles.preview, { borderColor: colors.border }]}>
          <Image
            source={{ uri: shown }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel={preview ? 'Chosen image' : current?.alt}
          />
        </View>
      ) : (
        <Text variant="footnote" tone="muted">
          No image: the app shows the date card.
        </Text>
      )}
      {current && !preview ? (
        <Stack gap="xs">
          <Text variant="footnote" tone="muted">
            {`Alt text: ${current.alt}`}
          </Text>
          {current.rights ? (
            <Text variant="footnote" tone="muted">
              {`Rights: ${COVER_IMAGE_RIGHTS_LABELS[current.rights]}`}
            </Text>
          ) : null}
          <Button
            title="Remove image"
            variant="outline"
            size="small"
            loading={removeImage.isPending}
            onPress={() => removeImage.mutate()}
          />
        </Stack>
      ) : null}

      <label style={{ display: 'flex' }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={current ? 'Choose a new image' : 'Choose an image'}
          onChange={(change) => choose(change.target.files?.[0] ?? null)}
        />
      </label>

      <Choices
        label="How may we use it?"
        options={RIGHTS}
        selected={rights ? [rights] : []}
        onToggle={setRights}
      />
      <Field
        label="Alt text (what the image shows)"
        value={alt}
        onChangeText={setAlt}
        maxLength={200}
        hint="Read aloud by screen readers, e.g. 'Speakers on stage at DevFest Douala'."
      />
      <Field
        label="Credit (optional)"
        value={credit}
        onChangeText={setCredit}
        maxLength={120}
        hint="Shown under the image on the event page."
      />
      {problem ? <Banner tone="error" message={problem} /> : null}
      {removeImage.error ? (
        <Banner tone="error" message={describeError(removeImage.error)} />
      ) : null}
      <Button
        title={current ? 'Replace image' : 'Add image'}
        variant="primary"
        loading={working}
        onPress={upload}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  preview: {
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
