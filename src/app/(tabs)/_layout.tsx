/**
 * TabsLayout
 *
 * All five tab icons are one family: lucide line icons at the same size and
 * stroke, tinted by the theme's active and inactive colours, so they match in
 * light and dark. The brand mark lives in the header logo, not the tab bar.
 */
import { Tabs } from 'expo-router';
import {
  Calendar,
  Compass,
  House,
  type LucideIcon,
  MapPin,
  User,
} from 'lucide-react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/ui/app-header';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { useAppLanguage } from '@/i18n/locale-provider';
import { Fonts, Spacing } from '@/theme';

const ICON_SIZE = 24;
const TAB_BAR_HEIGHT = 68;

/** The five tabs. Every other screen here is reached from them and shows
 *  the tab bar too, without a tab button of its own. */
const TAB_ROOTS = new Set(['index', 'explore', 'around-you', 'month', 'you']);
const HIDDEN_SCREENS = [
  'event/[id]',
  'submit/index',
  'submit/[id]',
  'privacy',
  'terms',
  'delete-account',
  'how-we-verify',
  'hidden-events',
  'privacy-settings',
];
const ICON_STROKE = 1.8;

function tabIcon(Icon: LucideIcon) {
  return ({ color }: { color: ColorValue }) => (
    <Icon size={ICON_SIZE} color={color} strokeWidth={ICON_STROKE} />
  );
}

export default function TabsLayout() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  useAppLanguage();

  return (
    <Tabs
      // Back returns to the screen you came from, not always to For You.
      backBehavior="history"
      screenOptions={{
        headerShown: true,
        header: ({ navigation, route }) => (
          <AppHeader
            canGoBack={!TAB_ROOTS.has(route.name) && navigation.canGoBack()}
            onBack={() => navigation.goBack()}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          // Icon (24) + label line (16) + padding, plus the home-indicator
          // inset, so labels are never clipped on any phone.
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: Spacing.sm,
          paddingBottom: Spacing.sm + insets.bottom,
        },
        // Five labels share the width: no side padding, so even a 320 px
        // screen fits the longest (57 px at 12 px).
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarLabelStyle: {
          fontFamily: Fonts.semiBold,
          fontSize: 12,
          lineHeight: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.forYou'),
          tabBarIcon: tabIcon(House),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: tabIcon(Compass),
        }}
      />
      <Tabs.Screen
        name="around-you"
        options={{
          title: t('tabs.aroundYou'),
          tabBarIcon: tabIcon(MapPin),
        }}
      />
      <Tabs.Screen
        name="month"
        options={{
          title: t('tabs.month'),
          tabBarIcon: tabIcon(Calendar),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: t('tabs.you'),
          tabBarIcon: tabIcon(User),
        }}
      />
      {HIDDEN_SCREENS.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
