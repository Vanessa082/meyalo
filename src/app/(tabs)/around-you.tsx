import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ThemeText } from '@/components/ui/theme-text';
import { t } from '@/i18n';

export default function AroundYouScreen() {
  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <ThemeText variant="header">{t('tabs.aroundYou')}</ThemeText>
        <ThemeText variant="caption">
          Explore local growth opportunities
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
