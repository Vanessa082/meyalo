import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BrandLogo } from '@/components/ui/brand-logo';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { Spacing } from '@/theme';

/** The website header: the logo (a link home) and the language switch. */
export function SiteHeader() {
  return (
    <View style={styles.header}>
      <Link href="/" aria-label="Meyalo">
        <BrandLogo variant="horizontal" size="md" />
      </Link>
      <LanguageToggle />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});
