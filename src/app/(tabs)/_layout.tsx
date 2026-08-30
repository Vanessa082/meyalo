import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';

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
            <Ionicons
              name={focused ? 'sparkles' : 'sparkles-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="around-you"
        options={{
          title: t('tabs.aroundYou'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'location' : 'location-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="month"
        options={{
          title: t('tabs.month'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: t('tabs.you'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
