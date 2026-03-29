import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TaskListView } from '@/features/tasks/TaskListView';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { filterTasks, sortTasks, TaskSort } from '@/utils/taskFilters';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function UpcomingScreen() {
  const { tasks, lists, completeTask, snoozeTask } = useApp();
  const { t } = useTranslation();
  const [sort, setSort] = useState<TaskSort>('nextNotification');
  const [tagFilter, setTagFilter] = useState('');

  const upcomingTasks = useMemo(
    () => sortTasks(filterTasks(tasks, { filter: 'week', sort, tag: tagFilter.trim() || null }), sort),
    [sort, tagFilter, tasks]
  );

  return (
    <Screen animateOnFocus tabHref="/upcoming">
      <Section title={t('upcoming.title')} />
      <TextField label={t('upcoming.filterLabel')} value={tagFilter} onChangeText={setTagFilter} placeholder={t('upcoming.filterPlaceholder')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        <Chip label={t('upcoming.sortStartDate')} selected={sort === 'startDate'} onPress={() => setSort('startDate')} />
        <Chip label={t('upcoming.sortReminder')} selected={sort === 'nextNotification'} onPress={() => setSort('nextNotification')} />
        <Chip label={t('upcoming.sortCreated')} selected={sort === 'createdAt'} onPress={() => setSort('createdAt')} />
      </View>
      <TaskListView
        tasks={upcomingTasks}
        lists={lists}
        emptyTitle={t('upcoming.emptyTitle')}
        emptyDescription={t('upcoming.emptyDescription')}
        onPressTask={(task) => router.push(`/tasks/${task.id}`)}
        onCompleteTask={(task) => void completeTask(task.id)}
        onSnoozeTask={(task) => void snoozeTask(task.id, new Date(Date.now() + 60 * 60 * 1000))}
      />
    </Screen>
  );
}
