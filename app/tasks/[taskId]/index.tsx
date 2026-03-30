import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TaskCard } from '@/components/TaskCard';
import { formatDateTimeTR, getVisibleTaskState } from '@/utils/date';
import { weekdayName } from '@/utils/date';
import { snoozeEveningTime } from '@/constants/settings';
import { useTranslation } from 'react-i18next';

export default function TaskDetailScreen() {
  const { tasks, lists, completeTask, snoozeTask, pauseTask, resumeTask, reactivateTask, removeTask, theme } = useApp();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ taskId: string }>();
  const routerInstance = useRouter();
  const task = useMemo(() => tasks.find((item) => item.id === params.taskId), [params.taskId, tasks]);

  if (!task) {
    return <Screen />;
  }

  const list = lists.find((item) => item.id === task.listId);
  const state = getVisibleTaskState(task);
  const isRecurring = task.taskMode === 'recurring';
  const isTodo = task.taskMode === 'todo';

  const snoozeUntil = (minutes: number) => new Date(Date.now() + minutes * 60_000);
  const snoozeEvening = () => {
    const date = new Date();
    const [hour, minute] = snoozeEveningTime.split(':').map(Number);
    date.setHours(hour, minute, 0, 0);
    if (date.getTime() <= Date.now()) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('taskDetail.title') }} />
      <TaskCard task={task} list={list} />

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('taskDetail.infoSection')}</Text>
        <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.list')} value={list?.name ?? t('common.noList')} />
        <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.taskType')} value={isTodo ? t('taskCard.modeTodo') : task.taskMode === 'recurring' ? t('taskCard.modeRecurring') : t('taskCard.modeSingle')} />
        {isTodo ? <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.notification')} value={t('common.none')} /> : <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.start')} value={formatDateTimeTR(task.startDateTime)} />}
        {isTodo ? <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.created')} value={formatDateTimeTR(task.createdAt)} /> : null}
        {!isTodo ? <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.lastNotification')} value={formatDateTimeTR(task.lastNotificationAt)} /> : null}
        {!isTodo ? <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.nextNotification')} value={formatDateTimeTR(task.nextNotificationAt)} /> : null}
        {isRecurring ? <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.completedCycle')} value={formatDateTimeTR(task.completedAt)} /> : null}
        <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.status')} value={state === 'overdue' ? t('taskCard.statusOverdue') : state === 'snoozed' ? t('taskCard.statusSnoozed') : state === 'completed' ? t('taskCard.statusCompleted') : t('taskCard.statusActive')} />
        {!isTodo && task.startReminderWeekday !== null ? <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.weekday')} value={weekdayName(task.startReminderWeekday)} /> : null}
        {isTodo ? <Text style={[styles.recurringNote, { color: theme.mutedText }]}>{t('taskDetail.todoNote')}</Text> : null}
        {isRecurring ? <Text style={[styles.recurringNote, { color: theme.mutedText }]}>{t('taskDetail.recurringNote')}</Text> : null}
      </Card>

      <View style={styles.buttonGroup}>
        <Button label={t('taskDetail.edit')} onPress={() => routerInstance.push(`/tasks/${task.id}/edit`)} />
        <Button label={isTodo ? t('taskDetail.completeTodo') : isRecurring ? t('taskDetail.completeRecurring') : t('taskDetail.completeSingle')} variant="secondary" onPress={() => void completeTask(task.id)} />
        <Button label={t('taskDetail.delete')} variant="danger" onPress={() => void confirmDelete(task.id, removeTask, isTodo, t)} />
      </View>

      {isTodo ? (
        task.status === 'completed' ? <Button label={t('taskDetail.reactivateTodo')} onPress={() => void reactivateTask(task.id)} /> : null
      ) : task.status === 'completed' ? (
        <Button label={t('taskDetail.reactivate')} onPress={() => void reactivateTask(task.id)} />
      ) : task.status === 'paused' ? (
        <Button label={t('taskDetail.resume')} onPress={() => void resumeTask(task.id)} />
      ) : (
        <Button label={t('taskDetail.pause')} variant="secondary" onPress={() => void pauseTask(task.id)} />
      )}

      {!isTodo && task.status !== 'completed' ? (
        <View style={styles.buttonGroup}>
          <Button label={t('taskDetail.snooze10')} variant="secondary" onPress={() => void snoozeTask(task.id, snoozeUntil(10))} />
          <Button label={t('taskDetail.snooze1h')} variant="secondary" onPress={() => void snoozeTask(task.id, snoozeUntil(60))} />
          <Button label={t('taskDetail.snoozeEvening')} variant="secondary" onPress={() => void snoozeTask(task.id, snoozeEvening())} />
          <Button label={t('taskDetail.snoozeTomorrow')} variant="secondary" onPress={() => void snoozeTask(task.id, (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d; })())} />
        </View>
      ) : null}
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  themeColor,
  labelColor,
  valueColor
}: {
  label: string;
  value: string;
  themeColor: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: themeColor }]}>
      <Text style={[styles.infoLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

async function confirmDelete(taskId: string, removeTask: (id: string) => Promise<void>, isTodo: boolean, t: (key: string) => string): Promise<void> {
  Alert.alert(t('taskDetail.deleteTitle'), isTodo ? t('taskDetail.deleteTodoBody') : t('taskDetail.deleteReminderBody'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('common.delete'),
      style: 'destructive',
      onPress: () => {
        void (async () => {
          await removeTask(taskId);
          router.back();
        })();
      }
    }
  ]);
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700'
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right'
  },
  buttonGroup: {
    gap: 10,
    marginBottom: 12
  },
  recurringNote: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
  }
});
