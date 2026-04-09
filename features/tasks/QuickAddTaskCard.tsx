import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TaskFormValues, TaskMode } from '@/types/domain';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareTextInput } from '@/components/KeyboardAwareTextInput';

export function QuickAddTaskCard({
  defaultListId
}: {
  defaultListId?: string | null;
}) {
  const { lists, theme, quickAddResetVersion, createTask, requestQuickAddReset, settings, isCreatingTask } = useApp();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [listId, setListId] = useState(defaultListId ?? lists[0]?.id ?? '');
  const [taskMode, setTaskMode] = useState<TaskMode>('recurring');
  const [localSaving, setLocalSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const visibleLists = useMemo(() => lists, [lists]);
  const submitLabel = taskMode === 'todo' ? t('common.save') : t('quickAdd.continue');

  useEffect(() => {
    const currentExists = listId ? lists.some((list) => list.id === listId) : false;
    const nextDefaultListId = defaultListId ?? lists[0]?.id ?? '';

    if (!currentExists && nextDefaultListId) {
      setListId(nextDefaultListId);
    }
  }, [defaultListId, listId, lists]);

  useEffect(() => {
    setTitle('');
    setError(null);
  }, [quickAddResetVersion]);

  const saving = isCreatingTask || localSaving;

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed || !listId || savingRef.current || saving) {
      return;
    }

    setError(null);

    if (taskMode === 'todo') {
      const values: TaskFormValues = {
        title: trimmed,
        description: '',
        listId,
        startReminderType: 'today_at_time',
        startDateTime: new Date(),
        startReminderWeekday: null,
        startReminderDayOfMonth: null,
        startReminderTime: settings.defaultStartTime,
        startReminderUsesLastDay: false,
        taskMode: 'todo',
        repeatIntervalType: 'preset',
        repeatIntervalValue: 1,
        repeatIntervalUnit: 'hours'
      };

      savingRef.current = true;
      setLocalSaving(true);

      try {
        await createTask(values);
        requestQuickAddReset();
      } catch (err) {
        setError(err instanceof Error ? err.message : null);
      } finally {
        savingRef.current = false;
        setLocalSaving(false);
      }

      return;
    }

    router.push({
      pathname: '/tasks/new',
      params: {
        title: trimmed,
        listId,
        taskMode
      }
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('quickAdd.title')}</Text>
      <Text style={[styles.sectionHint, { color: theme.mutedText }]}>{t('quickAdd.modeHint')}</Text>
      <KeyboardAwareTextInput
        value={title}
        onChangeText={setTitle}
        editable={!saving}
        placeholder={t('quickAdd.placeholder')}
        placeholderTextColor={theme.mutedText}
        style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border, opacity: saving ? 0.6 : 1 }]}
      />
      <View style={styles.modeStack}>
        <QuickModeCard
          active={taskMode !== 'todo'}
          title={t('quickAdd.modeReminder')}
          badge={t('quickAdd.reminderBadge')}
          description={t('quickAdd.reminderDescription')}
          icon="notifications-outline"
          accentColor={theme.primary}
          backgroundColor={taskMode !== 'todo' ? theme.primarySoft : theme.surface}
          disabled={saving}
          onPress={() => setTaskMode('recurring')}
        />
        <QuickModeCard
          active={taskMode === 'todo'}
          title={t('quickAdd.modeTodo')}
          badge={t('quickAdd.todoBadge')}
          description={t('quickAdd.todoDescription')}
          icon="checkmark-done-outline"
          accentColor={theme.success}
          backgroundColor={taskMode === 'todo' ? 'rgba(47, 122, 86, 0.10)' : theme.surface}
          disabled={saving}
          onPress={() => setTaskMode('todo')}
        />
      </View>
      <View style={[styles.sectionDivider, { borderTopColor: theme.border }]}>
        <Text style={[styles.sectionDividerText, { color: theme.mutedText, backgroundColor: theme.background }]}>{t('quickAdd.listDivider')}</Text>
      </View>
      <Text style={[styles.sectionHint, { color: theme.mutedText }]}>{t('quickAdd.listHint')}</Text>
      <View style={styles.listWrap}>
        {visibleLists.map((list) => (
          <Chip key={list.id} label={list.name} selected={listId === list.id} disabled={saving} onPress={() => setListId(list.id)} />
        ))}
      </View>
      <Text style={[styles.helper, { color: theme.mutedText }]}>{t('quickAdd.helper')}</Text>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <Button label={submitLabel} onPress={() => void handleSubmit()} loading={saving} disabled={saving} />
    </View>
  );
}

function QuickModeCard({
  active,
  title,
  badge,
  description,
  icon,
  accentColor,
  backgroundColor,
  disabled = false,
  onPress
}: {
  active: boolean;
  title: string;
  badge: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  backgroundColor: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { theme } = useApp();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.modeCard,
        {
          backgroundColor,
          borderColor: active ? accentColor : theme.border,
          shadowColor: theme.shadow,
          opacity: disabled ? 0.58 : pressed ? 0.94 : 1
        }
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: active ? accentColor : theme.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={active ? '#FFFFFF' : accentColor} />
      </View>
      <View style={styles.modeBody}>
        <View style={styles.modeHeader}>
          <Text style={[styles.modeTitle, { color: theme.text }]}>{title}</Text>
          <View style={[styles.modeBadge, { backgroundColor: active ? accentColor : theme.surfaceAlt }]}>
            <Text style={[styles.modeBadgeText, { color: active ? '#FFFFFF' : accentColor }]}>{badge}</Text>
          </View>
        </View>
        <Text style={[styles.modeDescription, { color: theme.mutedText }]}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 10
  },
  input: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12
  },
  modeStack: {
    gap: 12
  },
  modeCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  modeBody: {
    flex: 1
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 5
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1
  },
  modeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  modeDescription: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600'
  },
  sectionDivider: {
    borderTopWidth: 1,
    marginVertical: 14,
    alignItems: 'center'
  },
  sectionDividerText: {
    marginTop: -10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  listWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 10
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10
  }
});
