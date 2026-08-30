import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';

export default function InterestOnboardingScreen() {
  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <ThemeText variant="header">Select Your Growth Interests</ThemeText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
