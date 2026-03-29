import '@/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, NotificationBridge, useApp } from '@/context/AppContext';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

function AppShell() {
  const { ready, theme } = useApp();
  const { t } = useTranslation();

  if (!ready) {
    return (
        <View style={[styles.loading, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>{t('app.loading')}</Text>
        </View>
      );
  }

  return (
    <>
      <StatusBar style="auto" />
      <NotificationBridge />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background },
          headerTitleStyle: { fontWeight: '800' },
          headerBackTitle: ''
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tasks/new" options={{ title: t('routes.newTask') }} />
        <Stack.Screen name="lists/new" options={{ title: t('routes.newList') }} />
        <Stack.Screen name="tasks/[taskId]/edit" options={{ title: t('routes.editTask') }} />
        <Stack.Screen name="lists/[listId]" options={{ title: t('routes.listDetail') }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '800'
  }
});
