import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  Banner,
  ErrorState,
  LoadingState,
} from '@/components/console/console-ui';
import { EventForm } from '@/components/console/event-form';
import { useCreateEvent, useEventTaxonomy } from '@/hooks/use-curation';
import { useTheme } from '@/hooks/use-theme';
import { emptyEventFormValues } from '@/services/event-validation';

export default function NewEventScreen() {
  const colors = useTheme();
  const router = useRouter();
  const taxonomy = useEventTaxonomy();
  const create = useCreateEvent();
  const [initialValues] = useState(emptyEventFormValues);

  if (taxonomy.isPending) return <LoadingState label="Loading topics…" />;
  if (taxonomy.isError) {
    return (
      <ErrorState error={taxonomy.error} onRetry={() => taxonomy.refetch()} />
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page}
    >
      <Stack.Screen options={{ title: 'New event' }} />
      <Banner
        tone="info"
        message="New events are saved as unreviewed drafts. Record a source check, then publish from the event page."
      />
      <EventForm
        initialValues={initialValues}
        taxonomy={taxonomy.data}
        submitLabel="Create draft"
        submitting={create.isPending}
        saveError={create.error}
        onCancel={() => router.back()}
        onSubmit={(values) =>
          create.mutate(values, {
            onSuccess: (saved) =>
              router.replace({
                pathname: '/console/[id]',
                params: { id: saved.id },
              }),
          })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 14,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
});
