import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NestableDraggableFlatList, NestableScrollContainer } from 'react-native-draggable-flatlist';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { filterTasks, sortTasks } from '@/utils/taskFilters';
import { useTranslation } from 'react-i18next';

export default function ListDetailScreen() {
  const { lists, tasks, settings, theme, completeTask, snoozeTask, reorderTasks } = useApp();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ listId: string }>();
  const list = useMemo(() => lists.find((item) => item.id === params.listId), [lists, params.listId]);
  const listTasks = useMemo(
    () => sortTasks(filterTasks(tasks, { filter: 'all', sort: 'manual', listId: params.listId }), 'manual'),
    [params.listId, tasks]
  );
  const visibleTasks = useMemo(
    () => (settings.autoHideCompletedTasks ? listTasks.filter((task) => task.status !== 'completed') : listTasks),
    [listTasks, settings.autoHideCompletedTasks]
  );

  if (!list) {
    return <Screen />;
  }

  const activeCount = listTasks.filter((task) => task.status === 'active').length;
  const completedCount = listTasks.filter((task) => task.status === 'completed').length;

  return (
    <Screen scroll={false} padded={false}>
      <NestableScrollContainer contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: list.color }]} />
            <Text style={[styles.title, { color: theme.text }]}>{list.name}</Text>
          </View>
          <Text style={[styles.description, { color: theme.mutedText }]}>{t('listDetail.description', { activeCount, completedCount })}</Text>
          <Button label={t('listDetail.addTask')} onPress={() => router.push(`/tasks/new?listId=${list.id}`)} />
        </Card>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('listDetail.orderTitle')}</Text>
          <Text style={[styles.sectionHint, { color: theme.mutedText }]}>{t('listDetail.orderHint')}</Text>
          {visibleTasks.length === 0 ? (
            <EmptyState title={t('listDetail.emptyTitle')} description={t('listDetail.emptyDescription')} />
          ) : (
            <NestableDraggableFlatList
              data={visibleTasks}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => void reorderTasks(list.id, data.map((item) => item.id))}
              renderItem={({ item, drag, isActive }) => (
                <TaskCard
                  task={item}
                  list={lists.find((candidate) => candidate.id === item.listId)}
                  onPress={() => router.push(`/tasks/${item.id}`)}
                  onComplete={() => void completeTask(item.id)}
                  onSnooze={item.taskMode === 'todo' ? undefined : () => void snoozeTask(item.id, new Date(Date.now() + 10 * 60 * 1000))}
                  onLongPress={drag}
                  dragging={isActive}
                  showDragHandle
                />
              )}
            />
          )}
        </View>
      </NestableScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 36
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 999
  },
  title: {
    fontSize: 26,
    fontWeight: '900'
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12
  },
  section: {
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 12
  }
});
