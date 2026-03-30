import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/hooks/useApp';
import { Button } from '@/components/Button';

function FeatureCard({
  icon,
  iconBackground,
  title,
  description
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  title: string;
  description: string;
}) {
  const { theme } = useApp();

  return (
    <View style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
      <View style={[styles.featureIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={styles.featureCopy}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: theme.mutedText }]}>{description}</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { theme, updateSettings } = useApp();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const features = useMemo(
    () => [
      {
        icon: 'phone-portrait-outline' as const,
        iconBackground: theme.primary,
        title: t('onboarding.featureOneTitle'),
        description: t('onboarding.featureOneDescription')
      },
      {
        icon: 'notifications-outline' as const,
        iconBackground: theme.success,
        title: t('onboarding.featureTwoTitle'),
        description: t('onboarding.featureTwoDescription')
      },
      {
        icon: 'layers-outline' as const,
        iconBackground: theme.warning,
        title: t('onboarding.featureThreeTitle'),
        description: t('onboarding.featureThreeDescription')
      },
      {
        icon: 'settings-outline' as const,
        iconBackground: theme.danger,
        title: t('onboarding.featureFourTitle'),
        description: t('onboarding.featureFourDescription')
      }
    ],
    [t, theme.danger, theme.primary, theme.success, theme.warning]
  );

  const finishOnboarding = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    try {
      await updateSettings({ onboardingCompleted: 1 });
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 28
          }
        ]}
      >
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
            <Ionicons name="sparkles-outline" size={16} color={theme.primary} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>{t('onboarding.badge')}</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.mutedText }]}>{t('onboarding.subtitle')}</Text>
        </View>

        <View style={styles.featuresWrap}>
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </View>

        <View style={[styles.noteCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, shadowColor: theme.shadow }]}>
          <Ionicons name="cloud-offline-outline" size={20} color={theme.primary} />
          <View style={styles.noteCopy}>
            <Text style={[styles.noteTitle, { color: theme.text }]}>{t('onboarding.noteTitle')}</Text>
            <Text style={[styles.noteDescription, { color: theme.mutedText }]}>{t('onboarding.noteDescription')}</Text>
          </View>
        </View>

        <Button label={t('onboarding.cta')} onPress={() => void finishOnboarding()} loading={saving} />

        <Pressable accessibilityRole="button" onPress={() => void finishOnboarding()} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.mutedText }]}>{t('onboarding.skip')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  content: {
    paddingHorizontal: 16
  },
  hero: {
    marginBottom: 18
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22
  },
  featuresWrap: {
    marginBottom: 16
  },
  featureCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  featureCopy: {
    flex: 1,
    paddingTop: 2
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 19
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  noteCopy: {
    flex: 1
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4
  },
  noteDescription: {
    fontSize: 13,
    lineHeight: 19
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700'
  }
});
