import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useApp } from '@/hooks/useApp';
import { createScreenshotSeedPayload, resolveScreenshotSeedDestination } from '@/utils/screenshotFixtures';

export default function ScreenshotSeedScreen() {
  const { enableDebugScreenshotMode, replaceBackup, theme } = useApp();
  const params = useLocalSearchParams<{ locale?: string; screen?: string }>();
  const [error, setError] = useState<string | null>(null);
  const locale = useMemo(() => (typeof params.locale === 'string' ? params.locale : 'en-US'), [params.locale]);
  const destination = useMemo(
    () => resolveScreenshotSeedDestination(typeof params.screen === 'string' ? params.screen : undefined),
    [params.screen]
  );

  useEffect(() => {
    let cancelled = false;

    if (!__DEV__) {
      router.replace('/');
      return;
    }

    void (async () => {
      const payload = createScreenshotSeedPayload(locale);
      const result = await replaceBackup(JSON.stringify(payload), { suppressSuccessToast: true });

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.error ?? 'Unable to load screenshot data.');
        return;
      }

      enableDebugScreenshotMode();
      router.replace(destination);
    })();

    return () => {
      cancelled = true;
    };
  }, [destination, enableDebugScreenshotMode, locale, replaceBackup]);

  return (
    <Screen scroll={false} testID="screenshot-seed-screen">
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Preparing screenshot data...</Text>
        <Text style={[styles.meta, { color: error ? theme.danger : theme.mutedText }]}>
          {error ?? `Locale: ${locale} | Destination: ${destination}`}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '800'
  },
  meta: {
    fontSize: 14,
    textAlign: 'center'
  }
});
