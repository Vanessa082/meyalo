import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Banner,
  ErrorState,
  Field,
  LoadingState,
} from '@/components/console/console-ui';
import { Button } from '@/components/ui/button';
import { ThemeText } from '@/components/ui/theme-text';
import { useCuratorSession } from '@/hooks/use-curator-session';
import { useTheme } from '@/hooks/use-theme';

/**
 * Curation console. Showing or hiding screens here is a convenience; every
 * read and write is still decided by Row Level Security on the session.
 */
export default function ConsoleLayout() {
  const colors = useTheme();
  const curator = useCuratorSession();

  if (!curator.ready) {
    return <LoadingState label="Checking session…" />;
  }

  if (!curator.session) {
    return <SignIn onSignIn={curator.signIn} />;
  }

  if (curator.roleLoading) {
    return <LoadingState label="Checking curator access…" />;
  }

  if (curator.roleError) {
    return <ErrorState error={curator.roleError} onRetry={curator.retryRole} />;
  }

  if (!curator.isCurator) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.centered}
      >
        <ThemeText variant="title">Not a curator account</ThemeText>
        <ThemeText variant="caption" themeColor="textMuted">
          Signed in as {curator.session.user.email}. This account does not have
          the curator role, so the database will not let it change events.
        </ThemeText>
        <Button
          title="Sign out"
          variant="outline"
          onPress={() => curator.signOut()}
        />
      </ScrollView>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <View style={styles.headerRight}>
            <ThemeText variant="caption" themeColor="textMuted">
              {curator.session?.user.email}
            </ThemeText>
            <Button
              title="Sign out"
              variant="ghost"
              size="small"
              onPress={() => curator.signOut()}
            />
          </View>
        ),
      }}
    />
  );
}

function SignIn({
  onSignIn,
}: {
  onSignIn: (email: string, password: string) => Promise<void>;
}) {
  const colors = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await onSignIn(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.centered}
    >
      <ThemeText variant="title">Meyalo curation</ThemeText>
      <ThemeText variant="caption" themeColor="textMuted">
        Curator accounts only.
      </ThemeText>
      {error ? <Banner tone="error" message={error} /> : null}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        onSubmitEditing={submit}
      />
      <Button
        title="Sign in"
        loading={pending}
        disabled={!email || !password}
        onPress={submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
});
