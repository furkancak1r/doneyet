import { StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useApp } from '@/hooks/useApp';

function InfoCard({
  icon,
  title,
  description
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  const { theme } = useApp();

  return (
    <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
      <View style={[styles.infoIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.infoDescription, { color: theme.mutedText }]}>{description}</Text>
      </View>
    </View>
  );
}

export default function AboutScreen() {
  const { theme } = useApp();
  const { t } = useTranslation();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen animateOnFocus>
      <Section title={t('about.title')}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryBadge, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="checkmark-done-outline" size={18} color={theme.primary} />
            </View>
            <View style={styles.summaryTextWrap}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>{t('about.summaryTitle')}</Text>
              <Text style={[styles.summaryDescription, { color: theme.mutedText }]}>{t('about.summaryDescription')}</Text>
            </View>
          </View>
          <View style={[styles.versionRow, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Text style={[styles.versionLabel, { color: theme.mutedText }]}>{t('about.versionLabel')}</Text>
            <Text style={[styles.versionValue, { color: theme.text }]}>{appVersion}</Text>
          </View>
        </Card>
      </Section>

      <Section title={t('about.localTitle')}>
        <InfoCard icon="phone-portrait-outline" title={t('about.localCardTitle')} description={t('about.localDescription')} />
      </Section>

      <Section title={t('about.reminderTitle')}>
        <InfoCard icon="notifications-outline" title={t('about.reminderCardTitle')} description={t('about.reminderDescription')} />
      </Section>

      <Section title={t('about.onboardingTitle')}>
        <Card style={styles.onboardingCard}>
          <Text style={[styles.onboardingDescription, { color: theme.mutedText }]}>{t('about.onboardingDescription')}</Text>
          <Button label={t('about.openOnboarding')} onPress={() => router.push('/onboarding')} />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: 14
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  summaryBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  summaryTextWrap: {
    flex: 1
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4
  },
  summaryDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  versionRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  versionLabel: {
    fontSize: 13,
    fontWeight: '700'
  },
  versionValue: {
    fontSize: 14,
    fontWeight: '800'
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoCopy: {
    flex: 1
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4
  },
  infoDescription: {
    fontSize: 13,
    lineHeight: 19
  },
  onboardingCard: {
    gap: 12
  },
  onboardingDescription: {
    fontSize: 14,
    lineHeight: 20
  }
});
