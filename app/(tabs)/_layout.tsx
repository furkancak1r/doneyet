import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/hooks/useApp';
import { useTranslation } from 'react-i18next';
import { TAB_SCREENS } from '@/constants/tabNavigation';

export default function TabsLayout() {
  const { theme } = useApp();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="index"
      detachInactiveScreens={false}
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        freezeOnBlur: true,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.mutedText,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          minHeight: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8)
        },
        tabBarItemStyle: {
          paddingVertical: 2
        },
        tabBarIconStyle: {
          marginTop: 0
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 10, lineHeight: 12, letterSpacing: 0.15, marginTop: 1 },
        tabBarHideOnKeyboard: true
      }}
    >
      {TAB_SCREENS.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: t(screen.titleKey),
            tabBarIcon: ({ color, size }) => <Ionicons name={screen.icon} size={size} color={color} />
          }}
        />
      ))}
    </Tabs>
  );
}
