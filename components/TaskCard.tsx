import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useApp } from '@/hooks/useApp';
import { Task } from '@/types/domain';
import { AppList } from '@/types/domain';
import { getVisibleTaskState, formatDateTimeTR } from '@/utils/date';
import { safeParseJson } from '@/utils/json';
import { StatusPill } from '@/components/StatusPill';
import { useTranslation } from 'react-i18next';

function getTaskModeLabel(taskMode: Task['taskMode'], t: (key: string) => string): string {
  if (taskMode === 'todo') {
    return t('taskCard.modeTodo');
  }

  return taskMode === 'recurring' ? t('taskCard.modeRecurring') : t('taskCard.modeSingle');
}

export function TaskCard({
  task,
  list,
  onPress,
  onComplete,
  onSnooze,
  onLongPress,
  dragging = false,
  showDragHandle = false
}: {
  task: Task;
  list?: AppList | null;
  onPress?: () => void;
  onComplete?: () => void;
  onSnooze?: () => void;
  onLongPress?: () => void;
  dragging?: boolean;
  showDragHandle?: boolean;
}) {
  const { theme } = useApp();
  const { t } = useTranslation();
  const state = useMemo(() => getVisibleTaskState(task), [task]);
  const tags = safeParseJson<string[]>(task.tagsJson, []);
  const isTodo = task.taskMode === 'todo';

  const rightActions = () => (
    <Pressable onPress={onComplete} style={[styles.actionButton, { backgroundColor: theme.success }]}>
      <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
      <Text style={styles.actionLabel}>{t('taskCard.actionDone')}</Text>
    </Pressable>
  );

  const leftActions = () => (
    <Pressable onPress={onSnooze} style={[styles.actionButton, { backgroundColor: theme.warning }]}>
      <Ionicons name="alarm" size={22} color="#FFFFFF" />
      <Text style={styles.actionLabel}>{t('taskCard.actionSnooze')}</Text>
    </Pressable>
  );

  return (
    <Swipeable
      renderRightActions={onComplete ? rightActions : undefined}
      renderLeftActions={onSnooze && !isTodo ? leftActions : undefined}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={180}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: dragging ? theme.primary : theme.border,
            opacity: pressed || dragging ? 0.88 : task.status === 'completed' ? 0.7 : 1,
            transform: [{ scale: dragging ? 0.985 : 1 }]
          }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            {list ? <View style={[styles.listColor, { backgroundColor: list.color }]} /> : null}
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {task.title}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {showDragHandle ? <Ionicons name="reorder-three-outline" size={22} color={theme.mutedText} /> : null}
            <StatusPill
              label={state === 'overdue' ? t('taskCard.statusOverdue') : state === 'snoozed' ? t('taskCard.statusSnoozed') : state === 'completed' ? t('taskCard.statusCompleted') : t('taskCard.statusActive')}
              tone={state === 'overdue' ? 'danger' : state === 'snoozed' ? 'warning' : state === 'completed' ? 'success' : 'primary'}
            />
          </View>
        </View>
        <View style={styles.modeRow}>
          <StatusPill
            label={getTaskModeLabel(task.taskMode, t)}
            tone={task.taskMode === 'todo' ? 'primary' : task.taskMode === 'recurring' ? 'warning' : 'default'}
          />
        </View>
        {task.description ? <Text style={[styles.description, { color: theme.mutedText }]} numberOfLines={2}>{task.description}</Text> : null}
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: theme.mutedText }]}>{list?.name ?? t('common.noList')}</Text>
          <Text style={[styles.meta, { color: theme.mutedText }]}>{isTodo ? t('common.noNotification') : formatDateTimeTR(task.nextNotificationAt ?? task.startDateTime)}</Text>
        </View>
        {tags.length > 0 ? (
          <View style={styles.tagRow}>
            {tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.tagText, { color: theme.text }]}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  listColor: {
    width: 12,
    height: 12,
    borderRadius: 999
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10
  },
  modeRow: {
    marginBottom: 10
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10
  },
  meta: {
    fontSize: 12,
    fontWeight: '600'
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 6
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600'
  },
  actionButton: {
    width: 96,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 18,
    marginHorizontal: 4
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4
  }
});
