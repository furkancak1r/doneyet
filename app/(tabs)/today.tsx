import { useMemo } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TaskListView } from '@/features/tasks/TaskListView';
import { filterTasks, sortTasks } from '@/utils/taskFilters';
import { useTranslation } from 'react-i18next';

export default function TodayScreen() {
  const { tasks, lists, theme, completeTask, snoozeTask } = useApp();
  const { t } = useTranslation();
  const todayTasks = useMemo(() => sortTasks(filterTasks(tasks, { filter: 'today', sort: 'nextNotification' }), 'nextNotification'), [tasks]);

  return (
    <Screen animateOnFocus>
      <Section title={t('today.title')} />
      <TaskListView
        tasks={todayTasks}
        lists={lists}
        emptyTitle={t('today.emptyTitle')}
        emptyDescription={t('today.emptyDescription')}
        onPressTask={(task) => router.push(`/tasks/${task.id}`)}
        onCompleteTask={(task) => void completeTask(task.id)}
        onSnoozeTask={(task) => void snoozeTask(task.id, new Date(Date.now() + 10 * 60 * 1000))}
      />
    </Screen>
  );
}
