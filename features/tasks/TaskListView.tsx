import { View } from 'react-native';
import { TaskCard, type TaskCardSwipeHintDirection } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { useApp } from '@/hooks/useApp';
import { AppList, Task } from '@/types/domain';

export function TaskListView({
  tasks,
  lists,
  emptyTitle,
  emptyDescription,
  onPressTask,
  onCompleteTask,
  onFinishRecurringTask,
  onSnoozeTask,
  swipeHintTaskId,
  swipeHintDirection,
  onSwipeHintStarted
}: {
  tasks: Task[];
  lists: AppList[];
  emptyTitle: string;
  emptyDescription: string;
  onPressTask?: (task: Task) => void;
  onCompleteTask?: (task: Task) => void;
  onFinishRecurringTask?: (task: Task) => void;
  onSnoozeTask?: (task: Task) => void;
  swipeHintTaskId?: string;
  swipeHintDirection?: TaskCardSwipeHintDirection;
  onSwipeHintStarted?: () => void;
}) {
  const { isTaskMutating } = useApp();

  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <View>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          list={lists.find((list) => list.id === task.listId)}
          onPress={onPressTask ? () => onPressTask(task) : undefined}
          onComplete={onCompleteTask ? () => onCompleteTask(task) : undefined}
          onFinishRecurringTask={
            task.taskMode === 'recurring' && task.status !== 'completed' && onFinishRecurringTask
              ? () => onFinishRecurringTask(task)
              : undefined
          }
          onSnooze={onSnoozeTask ? () => onSnoozeTask(task) : undefined}
          disabled={isTaskMutating(task.id)}
          swipeHintDirection={swipeHintTaskId === task.id ? swipeHintDirection : undefined}
          onSwipeHintStarted={swipeHintTaskId === task.id ? onSwipeHintStarted : undefined}
        />
      ))}
    </View>
  );
}
