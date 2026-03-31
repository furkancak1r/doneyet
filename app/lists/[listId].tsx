import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NestableDraggableFlatList, NestableScrollContainer } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/hooks/useApp';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { filterTasks, sortTasks } from '@/utils/taskFilters';
import { useTranslation } from 'react-i18next';

export default function ListDetailScreen() {
  const { lists, tasks, settings, theme, completeTask, snoozeTask, reorderTasks, deleteList } = useApp();
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
  const totalTaskCount = listTasks.length;

  return (
    <Screen scroll={false} padded={false} testID="list-detail-screen">
      <NestableScrollContainer contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: list.color }]}>
              <Ionicons name={list.icon as any} size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{list.name}</Text>
          </View>
          <Text style={[styles.description, { color: theme.mutedText }]}>{t('listDetail.description', { activeCount, completedCount })}</Text>
          <View style={styles.actionGroup}>
          <Button label={t('listDetail.addTask')} onPress={() => router.push(`/tasks/new?listId=${list.id}`)} testID="list-detail-add-task" />
            <Button label={t('listDetail.edit')} variant="secondary" onPress={() => router.push(`/lists/${list.id}/edit`)} />
            <Button
              label={t('listDetail.delete')}
              variant="danger"
              onPress={() => void confirmDeleteList(list.id, deleteList, { activeCount, completedCount, totalTaskCount }, t)}
            />
          </View>
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

async function confirmDeleteList(
  listId: string,
  removeList: (id: string) => Promise<void>,
  counts: { activeCount: number; completedCount: number; totalTaskCount: number },
  t: (key: string, params?: Record<string, unknown>) => string
): Promise<void> {
  Alert.alert(
    t('listDetail.deleteTitle'),
    t('listDetail.deleteBody', {
      taskCount: counts.totalTaskCount,
      activeCount: counts.activeCount,
      completedCount: counts.completedCount
    }),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await removeList(listId);
            router.back();
          })();
        }
      }
    ]
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 44
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
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
  actionGroup: {
    gap: 12
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
