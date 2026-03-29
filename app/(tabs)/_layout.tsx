import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { theme } = useApp();
  const { t } = useTranslation();

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        freezeOnBlur: true,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.mutedText,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontWeight: '700' },
        tabBarHideOnKeyboard: true
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: t('tabs.upcoming'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="completed"
        options={{
          title: t('tabs.completed'),
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />
        }}
      />
    </Tabs>
  );
}
