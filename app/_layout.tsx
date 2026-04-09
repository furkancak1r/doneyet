import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider, NotificationBridge, useApp } from '@/context/AppContext';
import { AppToast } from '@/components/AppToast';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { I18nextProvider } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BrandLoadingIndicator } from '@/components/BrandLoadingIndicator';
import i18n from '@/i18n';

function AppShell() {
  const { ready, theme, toast, dismissToast } = useApp();
  const { t } = useTranslation();

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <BrandLoadingIndicator />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <NotificationBridge />
      <AppToast toast={toast} onDismiss={dismissToast} />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '800' },
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: ({ canGoBack }) =>
            canGoBack ? (
              <Pressable
                accessibilityLabel={t('common.back')}
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.72 : 1 }]}
                testID="nav-back"
              >
                <Ionicons name="chevron-back" size={18} color={theme.text} />
                <Text style={[styles.backLabel, { color: theme.text }]}>{t('common.back')}</Text>
              </Pressable>
            ) : undefined
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="debug/screenshot-seed" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="tasks/new" options={{ title: t('routes.newTask') }} />
        <Stack.Screen name="lists/new" options={{ title: t('routes.newList') }} />
        <Stack.Screen name="tasks/[taskId]/edit" options={{ title: t('routes.editTask') }} />
        <Stack.Screen name="lists/[listId]/edit" options={{ title: t('routes.editList') }} />
        <Stack.Screen name="lists/[listId]" options={{ title: t('routes.listDetail') }} />
        <Stack.Screen name="settings/about" options={{ title: t('about.title') }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 10
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '700'
  }
});
