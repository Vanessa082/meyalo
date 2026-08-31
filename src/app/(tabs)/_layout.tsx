/**
 * TabsLayout
 *
 * "For You" tab uses the Meyalo brand mark (teal M icon) instead of a
 * generic home icon — it IS the app identity.
 */
import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { Calendar, Compass, MapPin, User } from 'lucide-react-native';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

function MeyaloMarkIcon({ focused }: { color: ColorValue; focused: boolean }) {
  // The mark is always teal when active, muted grey when inactive.
  return (
    <Image
      source={
        focused
          ? require('../../../assets/brand/mark/meyalo-mark-teal-64.png')
          : require('../../../assets/brand/mark/meyalo-mark-teal-64.png')
      }
      style={{
        width: 26,
        height: 26,
        opacity: focused ? 1 : 0.4,
      }}
      contentFit="contain"
    />
  );
}

export default function TabsLayout() {
  const colors = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.forYou'),
          tabBarIcon: ({ color, focused }) => (
            <MeyaloMarkIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ color }) => (
            <Compass size={24} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="around-you"
        options={{
          title: t('tabs.aroundYou'),
          tabBarIcon: ({ color }) => (
            <MapPin size={24} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="month"
        options={{
          title: t('tabs.month'),
          tabBarIcon: ({ color }) => (
            <Calendar size={24} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: t('tabs.you'),
          tabBarIcon: ({ color }) => (
            <User size={24} color={color} strokeWidth={1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
