import { useCallback, useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TaskCard } from '@/components/TaskCard';
import { formatDateTimeTR, getTomorrowSnoozeDateForTask, getVisibleTaskState, weekdayName } from '@/utils/date';
import { snoozeEveningTime } from '@/constants/settings';
import { useTranslation } from 'react-i18next';

export default function TaskDetailScreen() {
  const { tasks, lists, completeTask, completeTaskPermanently, snoozeTask, pauseTask, resumeTask, reactivateTask, removeTask, theme, isTaskMutating } = useApp();
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
  const isCompleted = task.status === 'completed';
  const showCompleteAction = !isCompleted;
  const showSnoozeActions = !isTodo && !isCompleted;
  const taskBusy = isTaskMutating(task.id);
  const navigateAfterMutation = useCallback(() => {
    if (routerInstance.canGoBack()) {
      routerInstance.back();
      return;
    }

    router.replace('/(tabs)');
  }, [routerInstance]);

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

  const handleComplete = useCallback(async () => {
    if (taskBusy || isCompleted) {
      return;
    }

    await completeTask(task.id);
    navigateAfterMutation();
  }, [completeTask, isCompleted, navigateAfterMutation, task.id, taskBusy]);

  const handleCompleteAndFinish = useCallback(async () => {
    if (taskBusy || !isRecurring || isCompleted) {
      return;
    }

    try {
      await completeTaskPermanently(task.id);
      navigateAfterMutation();
    } catch (error) {
      console.error(`Failed to permanently complete recurring task ${task.id}.`, error);
    }
  }, [completeTaskPermanently, isCompleted, isRecurring, navigateAfterMutation, task.id, taskBusy]);

  const handlePause = useCallback(async () => {
    if (taskBusy || isCompleted || isTodo || task.status === 'paused') {
      return;
    }

    await pauseTask(task.id);
    navigateAfterMutation();
  }, [isCompleted, isTodo, navigateAfterMutation, pauseTask, task.id, task.status, taskBusy]);

  const handleResume = useCallback(async () => {
    if (taskBusy || isTodo || task.status !== 'paused') {
      return;
    }

    await resumeTask(task.id);
    navigateAfterMutation();
  }, [isTodo, navigateAfterMutation, resumeTask, task.id, task.status, taskBusy]);

  const handleReactivate = useCallback(async () => {
    if (taskBusy || !isCompleted) {
      return;
    }

    await reactivateTask(task.id);
    navigateAfterMutation();
  }, [isCompleted, navigateAfterMutation, reactivateTask, task.id, taskBusy]);

  const handleSnooze = useCallback(async (snoozedUntil: Date) => {
    if (taskBusy || !showSnoozeActions) {
      return;
    }

    await snoozeTask(task.id, snoozedUntil);
    navigateAfterMutation();
  }, [navigateAfterMutation, showSnoozeActions, snoozeTask, task.id, taskBusy]);

  const statusAction = isTodo ? (
    isCompleted ? <Button label={t('taskDetail.reactivateTodo')} onPress={() => void handleReactivate()} disabled={taskBusy} /> : null
  ) : isCompleted ? (
    <Button label={t('taskDetail.reactivate')} onPress={() => void handleReactivate()} disabled={taskBusy} />
  ) : task.status === 'paused' ? (
    <Button label={t('taskDetail.resume')} onPress={() => void handleResume()} disabled={taskBusy} />
  ) : (
    <Button label={t('taskDetail.pause')} variant="secondary" onPress={() => void handlePause()} disabled={taskBusy} />
  );

  return (
    <Screen testID="task-detail-screen">
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
        {isRecurring ? (
          <InfoRow
            labelColor={theme.mutedText}
            themeColor={theme.border}
            valueColor={theme.text}
            label={isCompleted ? t('taskDetail.completedAt') : t('taskDetail.completedCycle')}
            value={formatDateTimeTR(task.completedAt)}
          />
        ) : null}
        <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.status')} value={state === 'paused' ? t('common.paused') : state === 'overdue' ? t('taskCard.statusOverdue') : state === 'snoozed' ? t('taskCard.statusSnoozed') : state === 'completed' ? t('taskCard.statusCompleted') : t('taskCard.statusActive')} />
        {!isTodo && task.startReminderWeekday !== null ? <InfoRow labelColor={theme.mutedText} themeColor={theme.border} valueColor={theme.text} label={t('taskDetail.weekday')} value={weekdayName(task.startReminderWeekday)} /> : null}
        {isTodo ? <Text style={[styles.recurringNote, { color: theme.mutedText }]}>{t('taskDetail.todoNote')}</Text> : null}
        {isRecurring ? <Text style={[styles.recurringNote, { color: theme.mutedText }]}>{isCompleted ? t('taskDetail.recurringStoppedNote') : t('taskDetail.recurringNote')}</Text> : null}
      </Card>

      <View style={styles.actionStack}>
        <View style={styles.buttonGroup}>
          <Button label={t('taskDetail.edit')} onPress={() => routerInstance.push(`/tasks/${task.id}/edit`)} disabled={taskBusy} testID="task-detail-edit" />
          {showCompleteAction ? (
            <Button
              label={isTodo ? t('taskDetail.completeTodo') : isRecurring ? t('taskDetail.completeRecurring') : t('taskDetail.completeSingle')}
              variant="success"
              onPress={() => void handleComplete()}
              disabled={taskBusy}
              testID="task-detail-complete"
            />
          ) : null}
          {isRecurring && !isCompleted ? (
            <Button
              label={t('taskDetail.completeRecurringAndStop')}
              variant="secondary"
              onPress={handleCompleteAndFinish}
              disabled={taskBusy}
              testID="task-detail-complete-and-stop"
            />
          ) : null}
          <Button
            label={t('taskDetail.delete')}
            variant="danger"
            onPress={() => void confirmDelete(task.id, removeTask, isTodo, t, navigateAfterMutation)}
            disabled={taskBusy}
            testID="task-detail-delete"
          />
        </View>

        {statusAction ? <View style={styles.buttonGroup}>{statusAction}</View> : null}

        {showSnoozeActions ? (
          <View style={styles.buttonGroup}>
            <Button label={t('taskDetail.snooze10')} variant="secondary" onPress={() => void handleSnooze(snoozeUntil(10))} disabled={taskBusy} testID="task-detail-snooze-10m" />
            <Button label={t('taskDetail.snooze1h')} variant="secondary" onPress={() => void handleSnooze(snoozeUntil(60))} disabled={taskBusy} testID="task-detail-snooze-1h" />
            <Button label={t('taskDetail.snoozeEvening')} variant="secondary" onPress={() => void handleSnooze(snoozeEvening())} disabled={taskBusy} testID="task-detail-snooze-evening" />
            <Button
              label={t('taskDetail.snoozeTomorrow')}
              variant="secondary"
              disabled={taskBusy}
              onPress={() => void handleSnooze(getTomorrowSnoozeDateForTask(task))}
              testID="task-detail-snooze-tomorrow"
            />
          </View>
        ) : null}
      </View>
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

async function confirmDelete(
  taskId: string,
  removeTask: (id: string) => Promise<void>,
  isTodo: boolean,
  t: (key: string) => string,
  navigateAfterMutation: () => void
): Promise<void> {
  Alert.alert(t('taskDetail.deleteTitle'), isTodo ? t('taskDetail.deleteTodoBody') : t('taskDetail.deleteReminderBody'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('common.delete'),
      style: 'destructive',
      onPress: () => {
        void (async () => {
          await removeTask(taskId);
          navigateAfterMutation();
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
  actionStack: {
    gap: 16
  },
  buttonGroup: {
    gap: 12
  },
  recurringNote: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
  }
});
