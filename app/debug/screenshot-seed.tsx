import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useApp } from '@/hooks/useApp';
import { createScreenshotSeedPayload } from '@/utils/screenshotFixtures';

export default function ScreenshotSeedScreen() {
  const { replaceBackup, theme } = useApp();
  const params = useLocalSearchParams<{ locale?: string }>();
  const [error, setError] = useState<string | null>(null);
  const locale = useMemo(() => (typeof params.locale === 'string' ? params.locale : 'en-US'), [params.locale]);

  useEffect(() => {
    let cancelled = false;

    if (!__DEV__) {
      router.replace('/');
      return;
    }

    void (async () => {
      const payload = createScreenshotSeedPayload(locale);
      const result = await replaceBackup(JSON.stringify(payload));

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.error ?? 'Unable to load screenshot data.');
        return;
      }

      router.replace('/(tabs)');
    })();

    return () => {
      cancelled = true;
    };
  }, [locale, replaceBackup]);

  return (
    <Screen scroll={false} testID="screenshot-seed-screen">
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Preparing screenshot data...</Text>
        <Text style={[styles.meta, { color: error ? theme.danger : theme.mutedText }]}>
          {error ?? `Locale: ${locale}`}
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
