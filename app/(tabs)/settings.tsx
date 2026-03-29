import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { DateTimeField } from '@/components/DateTimeField';
import { useTranslation } from 'react-i18next';

function toDateFromTime(clock: string): Date {
  const now = new Date();
  const [hour, minute] = clock.split(':').map(Number);
  now.setHours(hour || 0, minute || 0, 0, 0);
  return now;
}

export default function SettingsScreen() {
  const { settings, updateSettings, theme, exportBackup, importBackup, notificationGranted, requestNotificationPermission } = useApp();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [startTime, setStartTime] = useState(toDateFromTime(settings.defaultStartTime));
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const persistStartTime = async (value: Date) => {
    await updateSettings({
      defaultStartTime: `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
    });
  };

  const handleExport = async () => {
    const json = await exportBackup();
    await Share.share({ message: json, title: t('settings.backupExportTitle') });
  };

  const handleImport = async () => {
    const result = await importBackup(importText);
    if (!result.ok) {
      setImportError(result.error ?? t('settings.backupImportError'));
      return;
    }

    setImportText('');
    setImportError(null);
    Alert.alert(t('settings.backupImportedTitle'), t('settings.backupImportedMessage'));
  };

  const toggleImport = () => {
    setImportOpen((current) => {
      const next = !current;
      if (!current) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        });
      }
      return next;
    });
  };

  return (
    <Screen scrollRef={scrollRef} animateOnFocus>
      {!notificationGranted ? (
        <Section title={t('settings.permissionTitle')}>
          <View style={[styles.permissionCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
            <Text style={[styles.permissionTitle, { color: theme.text }]}>{t('settings.permissionCardTitle')}</Text>
            <Text style={[styles.permissionText, { color: theme.mutedText }]}>{t('settings.permissionText')}</Text>
            <Button label={t('settings.permissionButton')} onPress={() => void requestNotificationPermission()} />
          </View>
        </Section>
      ) : null}

      <Section title={t('settings.startSection')}>
        <DateTimeField
          label={t('settings.startLabel')}
          value={startTime}
          mode="time"
          onChange={(value) => {
            setStartTime(value);
            void persistStartTime(value);
          }}
        />

        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: theme.text }]}>{t('settings.autoHide')}</Text>
          <Switch
            value={Boolean(settings.autoHideCompletedTasks)}
            onValueChange={(value) => void updateSettings({ autoHideCompletedTasks: value ? 1 : 0 })}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: theme.text }]}>{t('settings.sound')}</Text>
          <Switch value={Boolean(settings.soundEnabled)} onValueChange={(value) => void updateSettings({ soundEnabled: value ? 1 : 0 })} />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: theme.text }]}>{t('settings.vibration')}</Text>
          <Switch value={Boolean(settings.vibrationEnabled)} onValueChange={(value) => void updateSettings({ vibrationEnabled: value ? 1 : 0 })} />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: theme.text }]}>{t('settings.theme')}</Text>
        </View>
        <View style={styles.chipWrap}>
          <Chip label={t('settings.themeSystem')} tone="primary" selected={settings.themeMode === 'system'} onPress={() => void updateSettings({ themeMode: 'system' })} />
          <Chip label={t('settings.themeLight')} tone="primary" selected={settings.themeMode === 'light'} onPress={() => void updateSettings({ themeMode: 'light' })} />
          <Chip label={t('settings.themeDark')} tone="primary" selected={settings.themeMode === 'dark'} onPress={() => void updateSettings({ themeMode: 'dark' })} />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: theme.text }]}>{t('settings.language')}</Text>
        </View>
        <View style={styles.chipWrap}>
          <Chip label={t('settings.languageSystem')} tone="primary" selected={settings.language === 'system'} onPress={() => void updateSettings({ language: 'system' })} />
          <Chip label={t('settings.languageTurkish')} tone="primary" selected={settings.language === 'tr'} onPress={() => void updateSettings({ language: 'tr' })} />
          <Chip label={t('settings.languageEnglish')} tone="primary" selected={settings.language === 'en'} onPress={() => void updateSettings({ language: 'en' })} />
        </View>

      </Section>

      <Section title={t('settings.backupSection')}>
        <Button label={t('settings.backupExport')} onPress={() => void handleExport()} />
        <View style={{ height: 12 }} />
        <Text style={[styles.persistenceNote, { color: theme.mutedText }]}>{t('settings.backupPersistenceNote')}</Text>

        <Pressable
          onPress={toggleImport}
          style={({ pressed }) => [
            styles.importHeader,
            { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow, opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <Text style={[styles.importHeaderTitle, { color: theme.text }]}>{t('settings.backupImportTitle')}</Text>
          <Text style={[styles.importHeaderMeta, { color: theme.mutedText }]}>{importOpen ? t('settings.backupImportClose') : t('settings.backupImportOpen')}</Text>
        </Pressable>

        {importOpen ? (
          <View style={styles.importBody}>
            <TextInput
              value={importText}
              onChangeText={setImportText}
              placeholder={t('settings.backupImportPlaceholder')}
              placeholderTextColor={theme.mutedText}
              multiline
              style={[styles.multiline, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            />
            {importError ? <Text style={[styles.error, { color: theme.danger }]}>{importError}</Text> : null}
            <Button label={t('settings.backupImportButton')} onPress={() => void handleImport()} />
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  permissionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6
  },
  permissionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 12
  },
  multiline: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    marginBottom: 12
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  error: {
    marginBottom: 12,
    fontWeight: '700'
  },
  importHeader: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  importHeaderTitle: {
    fontSize: 14,
    fontWeight: '800'
  },
  importHeaderMeta: {
    fontSize: 13,
    fontWeight: '700'
  },
  importBody: {
    marginTop: 12
  },
  persistenceNote: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    fontWeight: '600'
  }
});
