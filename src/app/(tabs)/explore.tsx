import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { t } from '@/i18n';

export default function ExploreScreen() {
  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <ThemeText variant="header">{t('tabs.explore')}</ThemeText>
        <ThemeText variant="caption">
          Discover adjacent growth categories & sectors
        </ThemeText>
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
