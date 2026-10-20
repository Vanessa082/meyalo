import { useRouter } from 'expo-router';
import { ArrowLeft, UserCircle2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGutter } from '@/hooks/use-gutter';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/locale-provider';
import { Dimensions, Spacing } from '@/theme';
import { BrandLogo } from './brand-logo';
import { IconButton } from './icon-button';
import { LanguageToggle } from './language-toggle';

interface AppHeaderProps {
  /** True when there is a screen to go back to. */
  canGoBack: boolean;
  onBack: () => void;
}

/**
 * The header on every app screen: back (when there is history), the logo
 * (home), the language switch and the profile. It handles the top safe-area
 * inset, so pages below it do not.
 */
export function AppHeader({ canGoBack, onBack }: AppHeaderProps) {
  const router = useRouter();
  const colors = useTheme();
  const gutter = useGutter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + Spacing.sm,
          paddingHorizontal: gutter,
          backgroundColor: colors.background,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {canGoBack ? (
            <IconButton
              icon={<ArrowLeft size={22} color={colors.text} />}
              onPress={onBack}
              accessibilityLabel={t('common.back')}
            />
          ) : null}
          <Pressable
            onPress={() => router.navigate('/')}
            accessibilityRole="link"
            accessibilityLabel="Meyalo"
            hitSlop={Spacing.sm}
          >
            <BrandLogo size="sm" variant="horizontal" />
          </Pressable>
        </View>
        <View style={styles.side}>
          <LanguageToggle />
          <IconButton
            icon={<UserCircle2 size={26} color={colors.textMuted} />}
            onPress={() => router.navigate('/(tabs)/you')}
            accessibilityLabel={t('tabs.you')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    width: '100%',
    maxWidth: Dimensions.maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
