import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ErrorState, LoadingState } from '@/components/console/console-ui';
import { EventForm } from '@/components/console/event-form';
import {
  useCurationEvent,
  useEventTaxonomy,
  useUpdateEvent,
} from '@/hooks/use-curation';
import { useTheme } from '@/hooks/use-theme';
import { eventToFormValues } from '@/services/event-validation';
import type { Event, EventTaxonomy } from '@/types/event.type';

export default function EditEventScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useCurationEvent(id ?? '');
  const taxonomy = useEventTaxonomy();

  if (event.isPending || taxonomy.isPending) {
    return <LoadingState label="Loading event…" />;
  }
  if (event.isError || !event.data) {
    return <ErrorState error={event.error} onRetry={() => event.refetch()} />;
  }
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
      <Stack.Screen options={{ title: `Edit: ${event.data.title}` }} />
      <EditForm event={event.data} taxonomy={taxonomy.data} />
    </ScrollView>
  );
}

function EditForm({
  event,
  taxonomy,
}: {
  event: Event;
  taxonomy: EventTaxonomy;
}) {
  const router = useRouter();
  // The save must be checked against the version the form was filled from,
  // not a newer copy a background refetch may have brought in.
  const [base] = useState(event);
  const [initialValues] = useState(() => eventToFormValues(base));
  const save = useUpdateEvent(base);

  return (
    <EventForm
      initialValues={initialValues}
      taxonomy={taxonomy}
      submitLabel="Save changes"
      submitting={save.isPending}
      saveError={save.error}
      onCancel={() => router.back()}
      onSubmit={(values) =>
        save.mutate(values, {
          onSuccess: (saved) =>
            router.replace({
              pathname: '/console/[id]',
              params: { id: saved.id },
            }),
        })
      }
    />
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
});
