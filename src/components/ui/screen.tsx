import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import type { ScreenProps } from '@/types/screen.type';

export function Screen({ children, style, scrollable = false }: ScreenProps) {
  const colors = useTheme();

  const containerStyle = [
    styles.container,
    { backgroundColor: colors.background },
    style,
  ];

  if (scrollable) {
    return (
      <SafeAreaView style={containerStyle}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={containerStyle}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
