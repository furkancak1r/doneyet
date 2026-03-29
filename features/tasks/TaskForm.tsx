import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { Task, TaskFormValues, TaskMode } from '@/types/domain';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { DateTimeField } from '@/components/DateTimeField';
import { formatClock } from '@/utils/date';
import { safeParseJson } from '@/utils/json';
import { useTranslation } from 'react-i18next';

function getRepeatPresets(t: (key: string) => string) {
  return [
    { label: t('repeat.30m'), value: 30, unit: 'minutes' as const },
    { label: t('repeat.1h'), value: 1, unit: 'hours' as const },
    { label: t('repeat.2h'), value: 2, unit: 'hours' as const },
    { label: t('repeat.3h'), value: 3, unit: 'hours' as const },
    { label: t('repeat.6h'), value: 6, unit: 'hours' as const },
    { label: t('repeat.12h'), value: 12, unit: 'hours' as const },
    { label: t('repeat.24h'), value: 24, unit: 'hours' as const }
  ];
}

function toTimeString(value: Date): string {
  return formatClock(value);
}

function mergeDateWithClock(base: Date, source: Date): Date {
  const next = new Date(base);
  next.setFullYear(source.getFullYear(), source.getMonth(), source.getDate());
  next.setHours(source.getHours(), source.getMinutes(), 0, 0);
  return next;
}

function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const value = Number.parseInt(expanded, 16);

  if (Number.isNaN(value)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function TaskModeCard({
  active,
  badge,
  description,
  icon,
  label,
  accentColor,
  backgroundColor,
  onPress
}: {
  active: boolean;
  badge: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accentColor: string;
  backgroundColor: string;
  onPress: () => void;
}) {
  const { theme } = useApp();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        {
          backgroundColor,
          borderColor: active ? accentColor : theme.border,
          shadowColor: theme.shadow,
          opacity: pressed ? 0.94 : 1
        }
      ]}
    >
      <View style={[styles.modeIconWrap, { backgroundColor: hexToRgba(accentColor, active ? 0.18 : 0.12) }]}>
        <Ionicons name={icon} size={20} color={accentColor} />
      </View>

      <View style={styles.modeBody}>
        <View style={styles.modeHeader}>
          <Text style={[styles.modeLabel, { color: theme.text }]}>{label}</Text>
          <View style={[styles.modeBadge, { backgroundColor: hexToRgba(accentColor, active ? 0.18 : 0.1) }]}>
            <Text style={[styles.modeBadgeText, { color: accentColor }]}>{badge}</Text>
          </View>
        </View>
        <Text style={[styles.modeDescription, { color: theme.mutedText }]}>{description}</Text>
      </View>

      <View style={[styles.modeCheck, { borderColor: active ? accentColor : theme.border, backgroundColor: active ? accentColor : 'transparent' }]}>
        <Ionicons name={active ? 'checkmark' : 'ellipse-outline'} size={14} color={active ? '#FFFFFF' : theme.mutedText} />
      </View>
    </Pressable>
  );
}

export function TaskForm({
  initialTask,
  onSubmit,
  submitLabel,
  defaultListId,
  initialTitle,
  initialTaskMode
}: {
  initialTask?: Task | null;
  onSubmit: (values: TaskFormValues) => Promise<unknown> | unknown;
  submitLabel: string;
  defaultListId?: string | null;
  initialTitle?: string;
  initialTaskMode?: TaskMode;
}) {
  const { lists, theme } = useApp();
  const { t } = useTranslation();
  const listChoices = useMemo(() => (lists.length > 0 ? lists : []), [lists]);
  const repeatPresets = useMemo(() => getRepeatPresets(t), [t]);
  const weekdayLabels = useMemo(() => Array.from({ length: 7 }, (_, index) => t(`weekdays.${index}`)), [t]);
  const initialStart = initialTask ? new Date(initialTask.startDateTime) : new Date();
  const [title, setTitle] = useState(initialTask?.title ?? initialTitle ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [listId, setListId] = useState(initialTask?.listId ?? defaultListId ?? listChoices[0]?.id ?? '');
  const [taskMode, setTaskMode] = useState<TaskMode>(initialTaskMode ?? initialTask?.taskMode ?? 'single');
  const [reminderTaskMode, setReminderTaskMode] = useState<TaskMode>(initialTask?.taskMode === 'recurring' ? 'recurring' : 'single');
  const [startReminderType, setStartReminderType] = useState(initialTask?.startReminderType ?? 'today_at_time');
  const [startDateTime, setStartDateTime] = useState(initialStart);
  const [weekday, setWeekday] = useState<number>(initialTask?.startReminderWeekday ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState<string>(String(initialTask?.startReminderDayOfMonth ?? startDateTime.getDate()));
  const [useLastDay, setUseLastDay] = useState(Boolean(initialTask?.startReminderUsesLastDay));
  const [repeatIntervalValue, setRepeatIntervalValue] = useState(initialTask ? String(initialTask.repeatIntervalValue) : '');
  const [repeatIntervalUnit, setRepeatIntervalUnit] = useState(initialTask?.repeatIntervalUnit ?? 'minutes');
  const [repeatIntervalType, setRepeatIntervalType] = useState<TaskFormValues['repeatIntervalType'] | null>(initialTask?.repeatIntervalType ?? null);
  const [tagsText, setTagsText] = useState(initialTask ? safeParseJson<string[]>(initialTask.tagsJson || '[]', []).join(', ') : '');
  const [clockTime, setClockTime] = useState(toTimeString(initialStart));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listId && listChoices[0]?.id) {
      setListId(listChoices[0].id);
    }
  }, [listChoices, listId]);

  useEffect(() => {
    if (taskMode === 'recurring' && startReminderType === 'exact_date_time') {
      setStartReminderType('today_at_time');
    }
  }, [startReminderType, taskMode]);

  const isTodo = taskMode === 'todo';

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !listId) {
      setError(t('taskForm.validationTitleAndList'));
      return;
    }

    const repeatValue = Number(repeatIntervalValue);
    const nextRepeatIntervalType = isTodo ? (repeatIntervalType ?? 'preset') : repeatIntervalType;
    const nextRepeatIntervalValue = isTodo ? (Number.isFinite(repeatValue) && repeatValue > 0 ? repeatValue : 1) : repeatValue;

    if (!isTodo && !nextRepeatIntervalType) {
      setError(t('taskForm.validationRepeatRequired'));
      return;
    }

    if (!isTodo && (!Number.isFinite(repeatValue) || repeatValue <= 0)) {
      setError(t('taskForm.validationRepeatPositive'));
      return;
    }

    const values: TaskFormValues = {
      id: initialTask?.id,
      title: trimmedTitle,
      description: description.trim(),
      listId,
      taskMode,
      startReminderType: isTodo ? 'today_at_time' : startReminderType,
      startDateTime: isTodo ? (initialTask ? new Date(initialTask.startDateTime) : new Date()) : startDateTime,
      startReminderWeekday: !isTodo && startReminderType === 'weekly_on_weekday' ? weekday : null,
      startReminderDayOfMonth: !isTodo && startReminderType === 'monthly_on_day' ? Number(dayOfMonth) || null : null,
      startReminderTime: clockTime,
      startReminderUsesLastDay: !isTodo && startReminderType === 'monthly_on_last_day' ? useLastDay : false,
      repeatIntervalType: nextRepeatIntervalType ?? 'preset',
      repeatIntervalValue: nextRepeatIntervalValue,
      repeatIntervalUnit,
      tags: parseTags(tagsText)
    };

    await onSubmit(values);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TextField label={t('taskForm.title')} value={title} onChangeText={setTitle} placeholder={t('taskForm.titlePlaceholder')} />
      <TextField label={t('taskForm.description')} value={description} onChangeText={setDescription} placeholder={t('taskForm.descriptionPlaceholder')} multiline />

      <Card style={[styles.blockCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('taskForm.typeSection')}</Text>
          <Text style={[styles.sectionHint, { color: theme.mutedText }]}>{t('taskForm.typeHint')}</Text>
          <View style={styles.modeStack}>
            <TaskModeCard
              active={!isTodo}
              label={t('taskForm.reminder')}
              badge={t('taskForm.reminderCardBadge')}
              description={t('taskForm.reminderCardDescription')}
              icon="notifications-outline"
              accentColor={theme.primary}
              backgroundColor={!isTodo ? theme.primarySoft : theme.surface}
              onPress={() => setTaskMode(reminderTaskMode)}
            />
            <TaskModeCard
              active={isTodo}
              label={t('taskForm.todo')}
              badge={t('taskForm.todoCardBadge')}
              description={t('taskForm.todoCardDescription')}
              icon="checkmark-done-outline"
              accentColor={theme.success}
              backgroundColor={isTodo ? hexToRgba(theme.success, 0.1) : theme.surface}
              onPress={() => setTaskMode('todo')}
            />
          </View>
          {isTodo ? (
            <Text style={[styles.helper, { color: theme.mutedText }]}>{t('taskForm.todoHelper')}</Text>
          ) : (
            <Text style={[styles.helper, { color: theme.mutedText }]}>{t('taskForm.reminderHelper')}</Text>
          )}
        </View>
      </Card>

      <View style={[styles.sectionDivider, { borderTopColor: theme.border }]}>
        <Text style={[styles.sectionDividerText, { color: theme.mutedText, backgroundColor: theme.background }]}>{t('taskForm.sectionDivider')}</Text>
      </View>

      <Card style={[styles.blockCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('taskForm.listSection')}</Text>
          <Text style={[styles.sectionHint, { color: theme.mutedText }]}>{t('taskForm.listHint')}</Text>
          <View style={styles.chipWrap}>
            {listChoices.map((list) => (
              <Chip key={list.id} label={list.name} selected={listId === list.id} onPress={() => setListId(list.id)} />
            ))}
          </View>
        </View>
      </Card>

      {!isTodo ? (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('taskForm.subtypeSection')}</Text>
            <View style={styles.chipWrap}>
              <Chip
                label={t('taskForm.singleSubtype')}
                selected={taskMode === 'single'}
                onPress={() => {
                  setTaskMode('single');
                  setReminderTaskMode('single');
                }}
              />
              <Chip
                label={t('taskForm.recurringSubtype')}
                tone="primary"
                selected={taskMode === 'recurring'}
                onPress={() => {
                  setTaskMode('recurring');
                  setReminderTaskMode('recurring');
                }}
              />
            </View>
            {taskMode === 'recurring' ? (
              <Text style={[styles.helper, { color: theme.mutedText }]}>{t('taskForm.recurringHelper')}</Text>
            ) : (
              <Text style={[styles.helper, { color: theme.mutedText }]}>{t('taskForm.singleHelper')}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('taskForm.startSection')}</Text>
            <View style={styles.chipWrap}>
              {taskMode === 'single' ? <Chip label={t('taskForm.startExact')} selected={startReminderType === 'exact_date_time'} onPress={() => setStartReminderType('exact_date_time')} /> : null}
              <Chip label={t('taskForm.startToday')} selected={startReminderType === 'today_at_time'} onPress={() => setStartReminderType('today_at_time')} />
              <Chip label={t('taskForm.startTomorrow')} selected={startReminderType === 'tomorrow_at_time'} onPress={() => setStartReminderType('tomorrow_at_time')} />
              <Chip label={t('taskForm.startWeekly')} selected={startReminderType === 'weekly_on_weekday'} onPress={() => setStartReminderType('weekly_on_weekday')} />
              <Chip label={t('taskForm.startMonthly')} selected={startReminderType === 'monthly_on_day'} onPress={() => setStartReminderType('monthly_on_day')} />
              <Chip label={t('taskForm.startMonthLastDay')} selected={startReminderType === 'monthly_on_last_day'} onPress={() => setStartReminderType('monthly_on_last_day')} />
            </View>
            {taskMode === 'recurring' ? <Text style={[styles.helper, { color: theme.mutedText }]}>{t('taskForm.recurringStartHelper')}</Text> : null}
          </View>

          {startReminderType === 'exact_date_time' ? (
            <>
              <DateTimeField
                label={t('taskForm.dateLabel')}
                value={startDateTime}
                mode="date"
                onChange={(date) => {
                  const merged = mergeDateWithClock(startDateTime, date);
                  setStartDateTime(merged);
                }}
              />
              <DateTimeField
                label={t('taskForm.timeLabel')}
                value={startDateTime}
                mode="time"
                onChange={(date) => {
                  const merged = mergeDateWithClock(startDateTime, date);
                  setStartDateTime(merged);
                  setClockTime(toTimeString(merged));
                }}
              />
            </>
          ) : (
            <DateTimeField
              label={t('taskForm.timeLabel')}
              value={startDateTime}
              mode="time"
              onChange={(date) => {
                setStartDateTime(date);
                setClockTime(toTimeString(date));
              }}
            />
          )}

          {startReminderType === 'weekly_on_weekday' ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('taskForm.weekdaySection')}</Text>
              <View style={styles.chipWrap}>
                {weekdayLabels.map((day, index) => (
                  <Chip key={day} label={day} selected={weekday === index} onPress={() => setWeekday(index)} />
                ))}
              </View>
            </View>
          ) : null}

          {startReminderType === 'monthly_on_day' ? (
            <TextField label={t('taskForm.monthlyDay')} value={dayOfMonth} onChangeText={setDayOfMonth} placeholder={t('taskForm.monthlyDayPlaceholder')} />
          ) : null}

          {startReminderType === 'monthly_on_last_day' ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('taskForm.monthlyLastDaySection')}</Text>
              <View style={styles.chipWrap}>
                <Chip label={t('taskForm.monthlyLastDayToggle')} selected={useLastDay} onPress={() => setUseLastDay((current) => !current)} />
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('taskForm.repeatSection')}</Text>
            <View style={styles.chipWrap}>
              {repeatPresets.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  selected={repeatIntervalType === 'preset' && Number(repeatIntervalValue) === preset.value && repeatIntervalUnit === preset.unit}
                  onPress={() => {
                    setRepeatIntervalType('preset');
                    setRepeatIntervalValue(String(preset.value));
                    setRepeatIntervalUnit(preset.unit);
                  }}
                />
              ))}
              <Chip label={t('taskForm.repeatCustom')} selected={repeatIntervalType === 'custom'} onPress={() => setRepeatIntervalType('custom')} />
            </View>

            {repeatIntervalType === 'custom' ? (
              <View style={styles.customRow}>
                <View style={{ flex: 1 }}>
                  <TextField label={t('taskForm.repeatValue')} value={repeatIntervalValue} onChangeText={setRepeatIntervalValue} placeholder={t('taskForm.repeatValuePlaceholder')} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Chip label={t('taskForm.repeatMinutes')} selected={repeatIntervalUnit === 'minutes'} onPress={() => setRepeatIntervalUnit('minutes')} />
                  <Chip label={t('taskForm.repeatHours')} selected={repeatIntervalUnit === 'hours'} onPress={() => setRepeatIntervalUnit('hours')} />
                </View>
              </View>
            ) : null}
            {!repeatIntervalType ? <Text style={[styles.helper, { color: theme.mutedText }]}>{t('taskForm.repeatRequired')}</Text> : null}
          </View>
        </>
      ) : (
        <Text style={[styles.helper, { color: theme.mutedText, marginBottom: 10 }]}>{t('taskForm.validationFieldsHidden')}</Text>
      )}

      <TextField label={t('taskForm.tags')} value={tagsText} onChangeText={setTagsText} placeholder={t('taskForm.tagsPlaceholder')} />

      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button label={submitLabel} onPress={() => void handleSubmit()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
    gap: 2
  },
  section: {
    marginBottom: 18
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  sectionDivider: {
    borderTopWidth: 1,
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionDividerText: {
    marginTop: -10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.25
  },
  helper: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600'
  },
  blockCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 24,
    marginBottom: 0
  },
  modeStack: {
    gap: 12
  },
  modeCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  },
  modeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  modeBody: {
    flex: 1
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1
  },
  modeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  modeDescription: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600'
  },
  modeCheck: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginTop: 2
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  customRow: {
    gap: 8
  },
  error: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '700'
  },
  actions: {
    marginTop: 8
  }
});
