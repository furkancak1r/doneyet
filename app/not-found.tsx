import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text, View } from 'react-native';
import { useApp } from '@/hooks/useApp';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { theme } = useApp();
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 48 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{t('app.notFoundTitle')}</Text>
        <Link href="/(tabs)" style={{ color: theme.primary, fontSize: 16, fontWeight: '700' }}>
          {t('app.notFoundHome')}
        </Link>
      </View>
    </Screen>
  );
}
