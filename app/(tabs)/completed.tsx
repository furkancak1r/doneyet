import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TaskListView } from '@/features/tasks/TaskListView';
import { Chip } from '@/components/Chip';
import { filterTasks, sortTasks, TaskSort } from '@/utils/taskFilters';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function CompletedScreen() {
  const { tasks, lists, reactivateTask, removeTask } = useApp();
  const { t } = useTranslation();
  const [sort, setSort] = useState<TaskSort>('createdAt');

  const completedTasks = useMemo(() => sortTasks(filterTasks(tasks, { filter: 'completed', sort }), sort), [sort, tasks]);

  return (
    <Screen animateOnFocus tabHref="/completed">
      <Section title={t('completed.title')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        <Chip label={t('completed.sortCreated')} selected={sort === 'createdAt'} onPress={() => setSort('createdAt')} />
        <Chip label={t('completed.sortStartDate')} selected={sort === 'startDate'} onPress={() => setSort('startDate')} />
        <Chip label={t('completed.sortReminder')} selected={sort === 'nextNotification'} onPress={() => setSort('nextNotification')} />
      </View>
      <TaskListView
        tasks={completedTasks}
        lists={lists}
        emptyTitle={t('completed.emptyTitle')}
        emptyDescription={t('completed.emptyDescription')}
        onPressTask={(task) => router.push(`/tasks/${task.id}`)}
        onCompleteTask={undefined}
        onSnoozeTask={undefined}
      />
    </Screen>
  );
}
